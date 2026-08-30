"use client";

import { useActionState } from "react";
import { createExamSession, type ActionState } from "./actions";

const initialState: ActionState = {};

const YEAR_OPTIONS = [
  { value: "YEAR_1", label: "Year 1" },
  { value: "YEAR_2", label: "Year 2" },
  { value: "YEAR_3", label: "Year 3" },
  { value: "YEAR_4", label: "Year 4" },
  { value: "YEAR_5", label: "Year 5" },
];

export function CreateSessionForm() {
  const [state, formAction, pending] = useActionState(
    createExamSession,
    initialState,
  );

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-4 text-base font-medium text-slate-900">
        + New exam session
      </summary>
      <form action={formAction} className="flex flex-col gap-4 px-4 pb-4">
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
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="label" className="text-sm font-medium text-slate-700">
            Label (optional)
          </label>
          <input
            id="label"
            name="label"
            type="text"
            placeholder="e.g. Semester 1 Finals"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="startTime"
              className="text-sm font-medium text-slate-700"
            >
              Start time
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endTime" className="text-sm font-medium text-slate-700">
              End time
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
            />
          </div>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create session"}
        </button>
      </form>
    </details>
  );
}
