import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveAllocation } from "@/lib/allocation";
import { formatDate, formatTime, formatYear } from "@/lib/format";
import { buildAllocationExcel, buildAllocationPdf } from "@/lib/export";

function safeFilenamePart(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;

  const format = request.nextUrl.searchParams.get("format");
  if (format !== "pdf" && format !== "excel") {
    return NextResponse.json(
      { error: "format must be 'pdf' or 'excel'" },
      { status: 400 },
    );
  }

  const [session, allocation] = await Promise.all([
    prisma.examSession.findUnique({ where: { id } }),
    getActiveAllocation(id),
  ]);
  if (!session) notFound();
  if (!allocation) {
    return NextResponse.json(
      { error: "This session has no active allocation to export." },
      { status: 400 },
    );
  }

  const sessionLabel = `${formatYear(session.year)}${session.label ? ` — ${session.label}` : ""}`;
  const meta = {
    sessionLabel,
    sessionDate: formatDate(session.date),
    sessionTime: `${formatTime(session.startTime)}–${formatTime(session.endTime)}`,
    version: allocation.version,
  };
  const rows = allocation.seatAssignments.map((a) => ({
    seatNumber: a.seatNumber,
    matricNumber: a.student.matricNumber,
    fullName: a.student.fullName,
    program: a.student.program.name,
    year: formatYear(a.student.year),
  }));

  const baseName = `${safeFilenamePart(sessionLabel)}-v${allocation.version}`;

  if (format === "excel") {
    const buffer = await buildAllocationExcel(meta, rows);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  }

  const buffer = await buildAllocationPdf(meta, rows);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
    },
  });
}
