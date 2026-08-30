// No "server-only" marker: kept consistent with the other lib/ modules —
// pure enough (given already-fetched data) to import from a test runner
// without a live Next.js request context.

import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export type ExportRow = {
  seatNumber: number;
  matricNumber: string;
  fullName: string;
  program: string;
  year: string;
};

export type ExportMeta = {
  sessionLabel: string;
  sessionDate: string;
  sessionTime: string;
  version: number;
};

const HEADERS = ["Seat", "Matric No.", "Full Name", "Program", "Year"];

/** FR-EXP-02/03/04: Excel export, labeled with session and version. */
export async function buildAllocationExcel(
  meta: ExportMeta,
  rows: ExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Allocation");

  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = `${meta.sessionLabel} — Version ${meta.version}`;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.mergeCells("A2:E2");
  sheet.getCell("A2").value = `${meta.sessionDate} · ${meta.sessionTime}`;
  sheet.getCell("A2").font = { color: { argb: "FF666666" } };

  sheet.addRow([]);
  const headerRow = sheet.addRow(HEADERS);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  });

  for (const r of rows) {
    sheet.addRow([r.seatNumber, r.matricNumber, r.fullName, r.program, r.year]);
  }

  sheet.columns = [
    { width: 8 },
    { width: 20 },
    { width: 28 },
    { width: 26 },
    { width: 10 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** FR-EXP-01/03/04/05: PDF export, suitable for printing. */
export function buildAllocationPdf(
  meta: ExportMeta,
  rows: ExportRow[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).fillColor("#0f172a").text(meta.sessionLabel);
    doc
      .fontSize(10)
      .fillColor("#64748b")
      .text(`${meta.sessionDate} · ${meta.sessionTime}`)
      .text(
        `Allocation Version ${meta.version} · Exported ${new Date().toLocaleString()}`,
      );
    doc.moveDown();

    const headerCell = (text: string) => ({
      text,
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
    });

    doc.fontSize(9);
    doc.table({
      columnStyles: [60, 110, 170, 140, 50],
      defaultStyle: { padding: 6, textColor: "#0f172a" },
      data: [
        HEADERS.map(headerCell),
        ...rows.map((r) => [
          String(r.seatNumber),
          r.matricNumber,
          r.fullName,
          r.program,
          r.year,
        ]),
      ],
    });

    doc.end();
  });
}
