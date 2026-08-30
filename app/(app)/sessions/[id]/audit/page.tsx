import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime, formatYear } from "@/lib/format";
import type { AuditAction } from "@/app/generated/prisma/enums";

const ACTION_LABELS: Record<AuditAction, string> = {
  ALLOCATION_GENERATED: "Generated",
  ALLOCATION_REGENERATED: "Regenerated",
  ALLOCATION_ADMIN_OVERRIDE: "Admin Override",
};

export default async function AuditHistoryPage(
  props: PageProps<"/sessions/[id]/audit">,
) {
  await requireUser("ADMIN");
  const { id } = await props.params;

  const session = await prisma.examSession.findUnique({ where: { id } });
  if (!session) notFound();

  const entries = await prisma.auditLog.findMany({
    where: { examSessionId: id },
    orderBy: { toVersion: "desc" },
    include: { user: { select: { name: true } } },
  });

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Audit History</h1>
        <Link href={`/sessions/${id}`} className="text-sm text-slate-500">
          Back
        </Link>
      </div>

      <p className="text-sm text-slate-500">
        {formatYear(session.year)}
        {session.label ? ` — ${session.label}` : ""}
      </p>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          No allocation activity yet for this session.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">
                  Version {entry.toVersion}
                  {entry.fromVersion !== null && (
                    <span className="font-normal text-slate-400">
                      {" "}
                      (from {entry.fromVersion})
                    </span>
                  )}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.action === "ALLOCATION_ADMIN_OVERRIDE"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {ACTION_LABELS[entry.action]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {entry.user.name} · {formatDate(entry.createdAt)},{" "}
                {formatTime(entry.createdAt)}
              </p>
              {entry.reason && (
                <p className="mt-1 text-sm text-slate-600">
                  Reason: {entry.reason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
