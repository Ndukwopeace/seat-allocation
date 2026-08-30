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
    <details className="rounded-3xl border border-hairline bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-4 text-base font-medium text-ink">
        <span>Add or Remove Students</span>
        <span className="text-sm font-normal text-muted">
          {participants.length} students
        </span>
      </summary>

      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-student" className="text-sm font-medium text-ink">
            Add a student to this exam
          </label>
          <input
            id="add-student"
            type="search"
            placeholder="Search by name or student ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border-none bg-mist px-4 py-3.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
          {query.trim() !== "" && (
            <ul className="flex flex-col gap-1.5 rounded-2xl border border-hairline p-2">
              {filteredCandidates.length === 0 ? (
                <li className="px-2 py-1 text-sm text-muted">
                  No match, or already added.
                </li>
              ) : (
                filteredCandidates.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {c.fullName}
                      </p>
                      <p className="truncate text-xs text-muted">
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
                      className="flex-none inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
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
          <p className="text-sm font-medium text-ink">
            In this exam ({participants.length})
          </p>
          {participants.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-hairline px-3 py-4 text-center text-sm text-muted">
              No students in this exam yet.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-hairline p-2">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {p.fullName}
                    </p>
                    <p className="truncate text-xs text-muted">
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
                    className="flex-none inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs font-medium text-ink disabled:opacity-60"
                  >
                    {pendingId === p.id && <Spinner />}
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted">
          Changes here take effect the next time you make or remake the seat
          list — they don&rsquo;t change a seat number that&rsquo;s already
          been given.
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
