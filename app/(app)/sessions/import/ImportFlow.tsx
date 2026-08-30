"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Spinner } from "@/app/Spinner";
import { formatYear } from "@/lib/format";
import {
  previewSessionImport,
  confirmSessionImportAction,
  type PreviewState,
} from "./actions";

const initialPreviewState: PreviewState = {};

export function ImportFlow() {
  const [previewState, previewAction, previewPending] = useActionState(
    previewSessionImport,
    initialPreviewState,
  );
  const [confirmPending, startConfirm] = useTransition();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  if (imported !== null) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-hairline bg-white px-4 py-10 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <div>
          <p className="font-display text-lg font-medium text-ink">
            {imported} exam{imported === 1 ? "" : "s"} created
          </p>
          <p className="text-sm text-muted">
            Each one already has its roster of students for that year.
          </p>
        </div>
        <Link
          href="/sessions"
          className="rounded-full bg-coral px-4 py-3.5 text-base font-semibold text-white active:scale-[0.98]"
        >
          Back to Exams
        </Link>
      </div>
    );
  }

  const result = previewState.result;

  if (result) {
    const handleConfirm = () => {
      setConfirmError(null);
      startConfirm(async () => {
        const res = await confirmSessionImportAction(result.validRows);
        if (res.error) setConfirmError(res.error);
        else setImported(res.imported ?? 0);
      });
    };

    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <PreviewStat label="Total Rows" value={result.totalRows} />
          <PreviewStat label="Valid Rows" value={result.validRows.length} tone="ok" />
          <PreviewStat label="Errors" value={result.errors.length} tone="error" />
        </div>

        {fileName && (
          <p className="text-sm text-muted">
            From <span className="font-medium text-ink">{fileName}</span>
          </p>
        )}

        {result.errors.length > 0 && (
          <details className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-red-700">
              View {result.errors.length} error{result.errors.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-red-700">
              {result.errors.map((e) => (
                <li key={e.rowNumber}>
                  Row {e.rowNumber}: {e.message}
                </li>
              ))}
            </ul>
          </details>
        )}

        {result.validRows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-hairline">
            <table className="w-full text-left text-sm">
              <thead className="bg-mist text-ink/70">
                <tr>
                  <th className="px-4 py-2">Year</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Label</th>
                </tr>
              </thead>
              <tbody>
                {result.validRows.slice(0, 50).map((r) => (
                  <tr key={r.rowNumber} className="border-t border-hairline">
                    <td className="px-4 py-2">{formatYear(r.year)}</td>
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2">
                      {r.startTime}–{r.endTime}
                    </td>
                    <td className="px-4 py-2">{r.label ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.validRows.length > 50 && (
              <p className="border-t border-hairline px-4 py-2 text-xs text-muted">
                +{result.validRows.length - 50} more row
                {result.validRows.length - 50 === 1 ? "" : "s"} not shown
              </p>
            )}
          </div>
        )}

        {confirmError && (
          <p role="alert" className="text-sm text-red-600">
            {confirmError}
          </p>
        )}

        <div className="flex gap-2">
          <Link
            href="/sessions"
            className="flex-1 rounded-full border border-hairline px-4 py-3 text-center text-sm font-medium text-ink"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmPending || result.validRows.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-coral px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {confirmPending && <Spinner />}
            {confirmPending
              ? "Importing…"
              : `Confirm Import (${result.validRows.length})`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={previewAction} className="flex flex-col gap-4">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[24px] border-2 border-dashed border-hairline bg-mist px-4 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-coral text-xl text-white">
          ↑
        </span>
        <span className="text-sm font-medium text-ink">
          Click to upload or drag and drop
        </span>
        <span className="text-xs text-muted">CSV or XLSX (max 10MB)</span>
        <input
          type="file"
          name="file"
          accept=".csv,.xlsx"
          required
          className="sr-only"
          onChange={(e) => {
            setFileName(e.currentTarget.files?.[0]?.name ?? null);
            e.currentTarget.form?.requestSubmit();
          }}
        />
      </label>

      <a
        href="/session-import-template.csv"
        download
        className="text-center text-sm text-muted underline"
      >
        Download template
      </a>

      <p className="text-xs text-muted">
        Required columns: year, date, start_time, end_time (label is
        optional). One row per exam — every year can be in the same file.
      </p>

      {previewState.error && (
        <p role="alert" className="text-sm text-red-600">
          {previewState.error}
        </p>
      )}

      {previewPending && (
        <p className="flex items-center justify-center gap-2 text-center text-sm text-muted">
          <Spinner />
          Validating file…
        </p>
      )}
    </form>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "error";
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white px-3 py-3 text-center shadow-sm">
      <p
        className={`font-mono text-xl font-medium ${
          tone === "ok"
            ? "text-emerald-600"
            : tone === "error"
              ? "text-red-600"
              : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
