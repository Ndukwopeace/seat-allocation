"use client";

import { useState } from "react";

export function ExportPanel({ examSessionId }: { examSessionId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full border border-hairline px-4 py-3 text-base font-medium text-ink active:scale-[0.98]"
      >
        Download
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-hairline bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-ink">Choose a file type</p>
      <a
        href={`/sessions/${examSessionId}/export?format=pdf`}
        className="flex items-center gap-3 rounded-2xl border border-hairline px-4 py-3 text-sm font-medium text-ink active:scale-[0.98]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
          PDF
        </span>
        PDF File
      </a>
      <a
        href={`/sessions/${examSessionId}/export?format=excel`}
        className="flex items-center gap-3 rounded-2xl border border-hairline px-4 py-3 text-sm font-medium text-ink active:scale-[0.98]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          XLS
        </span>
        Excel File
      </a>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-full border border-hairline px-4 py-3 text-sm font-medium text-ink"
      >
        Cancel
      </button>
    </div>
  );
}
