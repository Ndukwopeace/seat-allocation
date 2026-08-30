"use client";

import { useActionState, useEffect, useRef } from "react";
import { Spinner } from "@/app/Spinner";
import { YEAR_OPTIONS } from "@/lib/format";
import { createStudentAction, type CreateStudentState } from "./actions";

const initialState: CreateStudentState = {};

export function AddStudentForm({
  programs,
}: {
  programs: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createStudentAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-4 text-base font-medium text-slate-900">
        + Add one student
      </summary>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4 px-4 pb-4"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="matricNumber"
            className="text-sm font-medium text-slate-700"
          >
            Matric number
          </label>
          <input
            id="matricNumber"
            name="matricNumber"
            type="text"
            required
            placeholder="e.g. SIU25SWE025"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="programId" className="text-sm font-medium text-slate-700">
            Program
          </label>
          <select
            id="programId"
            name="programId"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          >
            <option value="" disabled>
              Select a program
            </option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {programs.length === 0 && (
            <p className="text-xs text-red-600">
              No programs exist yet — add one under More → Programs first.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="year" className="text-sm font-medium text-slate-700">
            Year
          </label>
          <select
            id="year"
            name="year"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          >
            <option value="" disabled>
              Select a year
            </option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Automatically added to any existing session for this year.
          </p>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-600">Student added.</p>
        )}

        <button
          type="submit"
          disabled={pending || programs.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "Adding…" : "Add student"}
        </button>
      </form>
    </details>
  );
}
