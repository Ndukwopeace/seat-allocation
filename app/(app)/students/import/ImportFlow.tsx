"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Spinner } from "@/app/Spinner";
import { YEAR_OPTIONS, formatYear } from "@/lib/format";
import {
  previewImport,
  confirmImportAction,
  type PreviewState,
} from "./actions";

const initialPreviewState: PreviewState = {};

export function ImportFlow() {
  const [previewState, previewAction, previewPending] = useActionState(
    previewImport,
    initialPreviewState,
  );
  const [confirmPending, startConfirm] = useTransition();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [year, setYear] = useState("");

  if (imported !== null) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {imported} student{imported === 1 ? "" : "s"} imported
          </p>
          <p className="text-sm text-slate-500">
            They&rsquo;re now available for session allocation.
          </p>
        </div>
        <Link
          href="/students"
          className="rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white active:scale-[0.99]"
        >
          Back to Students
        </Link>
      </div>
    );
  }

  const result = previewState.result;

  if (result) {
    const handleConfirm = () => {
      setConfirmError(null);
      startConfirm(async () => {
        const res = await confirmImportAction(result.validRows);
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

        <p className="text-sm text-slate-500">
          Importing as{" "}
          <span className="font-medium text-slate-700">
            {formatYear(result.expectedYear)}
          </span>
          {fileName && (
            <>
              {" "}
              from <span className="font-medium text-slate-700">{fileName}</span>
            </>
          )}
        </p>

        {result.errors.length > 0 && (
          <details className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
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
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Matric No.</th>
                  <th className="px-4 py-2">Full Name</th>
                  <th className="px-4 py-2">Program</th>
                  <th className="px-4 py-2">Year</th>
                </tr>
              </thead>
              <tbody>
                {result.validRows.slice(0, 50).map((r) => (
                  <tr key={r.rowNumber} className="border-t border-slate-100">
                    <td className="px-4 py-2">{r.matricNumber}</td>
                    <td className="px-4 py-2">{r.fullName}</td>
                    <td className="px-4 py-2">{r.programName}</td>
                    <td className="px-4 py-2">{r.year.replace("YEAR_", "Year ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.validRows.length > 50 && (
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
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
            href="/students"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-700"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmPending || result.validRows.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="year" className="text-sm font-medium text-slate-700">
          Year
        </label>
        <select
          id="year"
          name="year"
          required
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
        >
          <option value="" disabled>
            Select the year this file is for
          </option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          One file per year — every row in the file must be this year.
        </p>
      </div>

      <label
        aria-disabled={!year}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center ${
          year
            ? "cursor-pointer border-slate-300 bg-slate-50"
            : "cursor-not-allowed border-slate-200 bg-slate-50/50"
        }`}
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl text-white ${
            year ? "bg-slate-900" : "bg-slate-300"
          }`}
        >
          ↑
        </span>
        <span
          className={`text-sm font-medium ${year ? "text-slate-700" : "text-slate-400"}`}
        >
          {year ? "Click to upload or drag and drop" : "Select a year above first"}
        </span>
        <span className="text-xs text-slate-500">CSV or XLSX (max 10MB)</span>
        <input
          type="file"
          name="file"
          accept=".csv,.xlsx"
          required
          disabled={!year}
          className="sr-only"
          onChange={(e) => {
            setFileName(e.currentTarget.files?.[0]?.name ?? null);
            e.currentTarget.form?.requestSubmit();
          }}
        />
      </label>

      <a
        href="/student-import-template.csv"
        download
        className="text-center text-sm text-slate-500 underline"
      >
        Download template
      </a>

      <p className="text-xs text-slate-500">
        Required columns: matric_number, full_name, program, year
      </p>

      {previewState.error && (
        <p role="alert" className="text-sm text-red-600">
          {previewState.error}
        </p>
      )}

      {previewPending && (
        <p className="flex items-center justify-center gap-2 text-center text-sm text-slate-500">
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
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm">
      <p
        className={`text-xl font-bold ${
          tone === "ok"
            ? "text-emerald-600"
            : tone === "error"
              ? "text-red-600"
              : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
