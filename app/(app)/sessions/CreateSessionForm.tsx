"use client";

import { useActionState } from "react";
import { Spinner } from "@/app/Spinner";
import { YEAR_OPTIONS } from "@/lib/format";
import { createExamSession, type ActionState } from "./actions";

const initialState: ActionState = {};

export function CreateSessionForm() {
  const [state, formAction, pending] = useActionState(
    createExamSession,
    initialState,
  );

  return (
    <details className="rounded-3xl border border-hairline bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-4 text-base font-medium text-ink">
        + New exam session
      </summary>
      <form action={formAction} className="flex flex-col gap-4 px-4 pb-4">
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
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="label" className="text-sm font-medium text-ink">
            Label (optional)
          </label>
          <input
            id="label"
            name="label"
            type="text"
            placeholder="e.g. Semester 1 Finals"
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-sm font-medium text-ink">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="startTime"
              className="text-sm font-medium text-ink"
            >
              Start time
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              required
              className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endTime" className="text-sm font-medium text-ink">
              End time
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              required
              className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
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
          className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "Creating…" : "Create session"}
        </button>
      </form>
    </details>
  );
}
