"use client";

import { useMemo, useState, useTransition } from "react";
import { Spinner } from "@/app/Spinner";
import { addParticipantAction, removeParticipantAction } from "../actions";

type Participant = {
  id: string;
  matricNumber: string;
  fullName: string;
  program: string;
  year: string;
};

export function ManageStudents({
  examSessionId,
  participants,
  candidates,
}: {
  examSessionId: string;
  participants: Participant[];
  candidates: Participant[];
}) {
  const [query, setQuery] = useState("");
  const [pendingId, startTransition] = usePendingId();

  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return candidates
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.matricNumber.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [candidates, query]);

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-4 text-base font-medium text-slate-900">
        <span>Manage Students</span>
        <span className="text-sm font-normal text-slate-500">
          {participants.length} on roster
        </span>
      </summary>

      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-student" className="text-sm font-medium text-slate-700">
            Add a student to this session
          </label>
          <input
            id="add-student"
            type="search"
            placeholder="Search by name or matric number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          />
          {query.trim() !== "" && (
            <ul className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-2">
              {filteredCandidates.length === 0 ? (
                <li className="px-2 py-1 text-sm text-slate-500">
                  No match, or already on the roster.
                </li>
              ) : (
                filteredCandidates.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {c.fullName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {c.matricNumber} · {c.program} · {c.year}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pendingId === c.id}
                      onClick={() =>
                        startTransition(c.id, () =>
                          addParticipantAction(examSessionId, c.id),
                        )
                      }
                      className="flex-none inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {pendingId === c.id && <Spinner />}
                      Add
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-slate-700">
            On the roster ({participants.length})
          </p>
          {participants.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
              No students on this session&rsquo;s roster yet.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {p.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {p.matricNumber} · {p.program} · {p.year}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pendingId === p.id}
                    onClick={() =>
                      startTransition(p.id, () =>
                        removeParticipantAction(examSessionId, p.id),
                      )
                    }
                    className="flex-none inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                  >
                    {pendingId === p.id && <Spinner />}
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Changes here take effect the next time an allocation is generated or
          regenerated — they don&rsquo;t retroactively change an
          already-issued seat number.
        </p>
      </div>
    </details>
  );
}

/**
 * Tracks which single row is mid-request, so only that row's button shows a
 * spinner rather than a global pending flag disabling every row at once.
 */
function usePendingId() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, action: () => Promise<unknown>) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await action();
      } finally {
        setPendingId(null);
      }
    });
  }

  return [pendingId, run] as const;
}
