import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ImportFlow } from "./ImportFlow";

export default async function ImportStudentsPage() {
  await requireUser("ADMIN");

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Import Students</h1>
        <Link href="/students" className="text-sm text-slate-500">
          Cancel
        </Link>
      </div>

      <ImportFlow />
    </main>
  );
}
