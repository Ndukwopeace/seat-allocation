"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Spinner } from "@/app/Spinner";
import { YEAR_OPTIONS } from "@/lib/format";
import { createStudentAction, type CreateStudentState } from "./actions";

const initialState: CreateStudentState = {};

export function AddStudentForm({
  programs,
}: {
  programs: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-coral px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98]"
      >
        + Add one student
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
          <label
            htmlFor="matricNumber"
            className="text-sm font-medium text-ink"
          >
            Student ID
          </label>
          <input
            id="matricNumber"
            name="matricNumber"
            type="text"
            required
            placeholder="e.g. SIU25SWE025"
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-ink">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="programId" className="text-sm font-medium text-ink">
            Course
          </label>
          <select
            id="programId"
            name="programId"
            required
            defaultValue=""
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          >
            <option value="" disabled>
              Select a course
            </option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {programs.length === 0 && (
            <p className="text-xs text-red-600">
              No courses yet — add one under More → Courses first.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="year" className="text-sm font-medium text-ink">
            Year
          </label>
          <select
            id="year"
            name="year"
            required
            defaultValue=""
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
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
          <p className="text-xs text-muted">
            Added automatically to any exam already made for this year.
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
            disabled={pending || programs.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending && <Spinner />}
            {pending ? "Adding…" : "Add student"}
          </button>
        </div>
      </form>
    </div>
  );
}
