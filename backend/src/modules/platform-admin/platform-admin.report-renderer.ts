import PDFDocument from "pdfkit";
import { rowsToCsv } from "./platform-admin.analytics.js";
import { formatReportDocument } from "./platform-admin.report-format.js";
import type { AdminReportDocument, ReportSection } from "./platform-admin.types.js";

const DEFAULT_BRAND = "#4f46e5";
const INK = "#172033";
const MUTED = "#667085";
const BORDER = "#dfe3eb";
const PAGE_MARGIN = 48;
const CONTENT_BOTTOM_GAP = 52;
const DEFAULT_REPORT_SUBTITLE = "PLATFORM ADMINISTRATION";

type PdfContentGeometry = {
  contentLeft: number;
  contentRight: number;
  contentWidth: number;
  contentTop: number;
  contentBottom: number;
};

type SectionPlacement = {
  title: string;
  titleX: number;
  descriptionX: number | null;
  headingPage: number;
  descriptionPage: number | null;
  initialContentPage: number;
  movedToNewPage: boolean;
};

export type ReportPdfLayoutDiagnostics = {
  geometry: PdfContentGeometry;
  sections: SectionPlacement[];
  helperExits: Array<{ helper: string; x: number }>;
  comparisonColumns: Array<{ label: string; x: number; width: number }>;
  comparisonRows: Array<{ label: string; height: number; page: number }>;
  tableRows: Array<{
    sectionTitle: string;
    rowIndex: number;
    height: number;
    page: number;
  }>;
};

type PdfRenderContext = {
  document: PDFKit.PDFDocument;
  geometry: PdfContentGeometry;
  diagnostics: ReportPdfLayoutDiagnostics;
};

type ComparisonColumn = {
  label: string;
  width: number;
  align: "left" | "right";
};

export type PreparedReportPdfTable = {
  headers: string[];
  rows: Array<Array<string | number | null>>;
  columnProportions?: number[];
  fontSize: number;
  wrapRows: boolean;
  semanticColumnIndex: number;
};

export function renderReportCsv(report: AdminReportDocument): Buffer {
  report = formatReportDocument(report);
  const rows: unknown[][] = [
    [report.branding.platformName],
    ...(report.branding.reportSubtitle
      ? [["Report context", report.branding.reportSubtitle]]
      : []),
    [report.title],
    ["Reporting period", report.period.from, report.period.to],
    ["Generated at", report.generatedAt],
    ["Filters", report.filters.join(" | ")],
    ["Scope", report.scope.label],
    ["Scope notes", report.scope.notes.join(" | ")],
    ["Management summary", report.managementSummary],
    [],
    ["Highlights"],
    ["Metric", "Value"],
    ...report.highlights.map((item) => [item.label, item.value])
  ];

  if (report.comparison) {
    rows.push(
      [],
      ["Previous-period comparison"],
      ["Metric", "Current", "Previous", "Absolute change", "Percentage change"],
      ...report.comparison.map((item) => [
        item.label,
        item.current,
        item.previous,
        item.absoluteChange,
        item.percentageLabel
      ])
    );
  }

  for (const section of report.sections) {
    rows.push(
      [],
      [section.title],
      section.headers,
      ...(section.rows.length
        ? section.rows
        : [[section.emptyMessage ?? "No persisted data matched this section."]])
    );
  }

  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => [
    ...row,
    ...Array.from({ length: width - row.length }, () => "")
  ]);
  return Buffer.from(
    `\uFEFF${rowsToCsv((normalized[0] ?? []).map(String), normalized.slice(1))}`,
    "utf8"
  );
}

export async function renderReportPdf(report: AdminReportDocument): Promise<Buffer> {
  return (await renderReportPdfWithDiagnostics(report)).buffer;
}

export async function renderReportPdfWithDiagnostics(
  sourceReport: AdminReportDocument
): Promise<{
  buffer: Buffer;
  intendedPageCount: number;
  layout: ReportPdfLayoutDiagnostics;
}> {
  const report = formatReportDocument(sourceReport);
  const brand = DEFAULT_BRAND;
  const reportSubtitle = report.branding.reportSubtitle ?? DEFAULT_REPORT_SUBTITLE;
  const document = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    bufferPages: true,
    info: {
      Title: report.title,
      Author: "SME Feedback",
      Subject:
        reportSubtitle === "BUSINESS REPORTING"
          ? "Business owner report"
          : "Platform administrator report"
    }
  });
  const geometry = createContentGeometry(document);
  const layout: ReportPdfLayoutDiagnostics = {
    geometry,
    sections: [],
    helperExits: [],
    comparisonColumns: [],
    comparisonRows: [],
    tableRows: []
  };
  const context: PdfRenderContext = { document, geometry, diagnostics: layout };
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  drawHeader(context, report, brand);
  drawManagementSummary(context, report.managementSummary);
  drawHighlights(context, report);

  if (report.comparison?.length) {
    drawComparison(context, report.comparison);
  }

  for (const section of report.sections) {
    drawSection(context, section, brand);
  }

  const range = document.bufferedPageRange();
  const intendedPageCount = range.count;
  for (let page = range.start; page < range.start + intendedPageCount; page += 1) {
    document.switchToPage(page);
    drawPageFooter(document, report, page - range.start + 1, intendedPageCount);
  }
  if (document.bufferedPageRange().count !== intendedPageCount) {
    throw new Error("Report footer rendering changed the physical PDF page count.");
  }

  document.end();
  await new Promise<void>((resolve, reject) => {
    document.on("end", resolve);
    document.on("error", reject);
  });
  return { buffer: Buffer.concat(chunks), intendedPageCount, layout };
}

function createContentGeometry(document: PDFKit.PDFDocument): PdfContentGeometry {
  const contentLeft = PAGE_MARGIN;
  const contentRight = document.page.width - PAGE_MARGIN;
  return {
    contentLeft,
    contentRight,
    contentWidth: contentRight - contentLeft,
    contentTop: PAGE_MARGIN,
    contentBottom: document.page.height - CONTENT_BOTTOM_GAP
  };
}

function drawPageFooter(
  document: PDFKit.PDFDocument,
  report: AdminReportDocument,
  pageNumber: number,
  pageCount: number
) {
  const previousX = document.x;
  const previousY = document.y;
  const previousBottomMargin = document.page.margins.bottom;
  try {
    document.page.margins.bottom = 0;
    document
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `${report.branding.reportFooterText} \u2022 ${report.title} \u2022 Page ${pageNumber} of ${pageCount}`,
        PAGE_MARGIN,
        document.page.height - 30,
        {
          width: document.page.width - PAGE_MARGIN * 2,
          align: "center",
          lineBreak: false
        }
      );
  } finally {
    document.page.margins.bottom = previousBottomMargin;
    document.x = previousX;
    document.y = previousY;
  }
}

function drawHeader(
  context: PdfRenderContext,
  report: AdminReportDocument,
  brand: string
) {
  const { document, geometry } = context;
  const { contentLeft, contentRight, contentWidth } = geometry;
  document.roundedRect(contentLeft, 42, 32, 32, 8).fill(brand);
  document.font("Helvetica-Bold").fontSize(14).fillColor("white").text("S", 59, 51);
  document
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(INK)
    .text(report.branding.platformName, 90, 48, { width: contentRight - 90 });
  document
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(report.branding.reportSubtitle ?? DEFAULT_REPORT_SUBTITLE, 90, 65, {
      width: contentRight - 90
    });

  document
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor(INK)
    .text(report.title, contentLeft, 105, { width: contentWidth });
  let y = document.y + 6;
  const metadata = [
    `Period: ${formatDate(report.period.from)} \u2013 ${formatDate(report.period.to)}`,
    `Generated: ${formatDateTime(report.generatedAt)}`,
    report.filters.join("  \u2022  "),
    `Scope: ${report.scope.label}`
  ];
  document.font("Helvetica").fontSize(9).fillColor(MUTED);
  for (const line of metadata) {
    document.text(line, contentLeft, y, { width: contentWidth });
    y = document.y;
  }
  document.fontSize(7.5);
  for (const note of report.scope.notes) {
    document.text(note, contentLeft, y, { width: contentWidth });
    y = document.y;
  }
  y += 10;
  document.moveTo(contentLeft, y).lineTo(contentRight, y).strokeColor(BORDER).stroke();
  restoreFlow(context, y + 14, "header");
}

function drawHighlights(context: PdfRenderContext, report: AdminReportDocument) {
  const { document, geometry } = context;
  sectionHeading(context, "At a glance");
  const cardWidth = (geometry.contentWidth - 12) / 3;
  let rowY = document.y;
  report.highlights.forEach((item, index) => {
    const column = index % 3;
    if (column === 0) {
      ensureSpace(context, 70);
      rowY = document.y;
    }
    const x = geometry.contentLeft + column * (cardWidth + 6);
    const y = rowY;
    document.roundedRect(x, y, cardWidth, 58, 6).fillAndStroke("#f7f8fb", BORDER);
    document
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(MUTED)
      .text(item.label, x + 10, y + 10, { width: cardWidth - 20 });
    document
      .font("Helvetica-Bold")
      .fontSize(17)
      .fillColor(INK)
      .text(formatValue(item.value), x + 10, y + 30, { width: cardWidth - 20 });
    if (column === 2 || index === report.highlights.length - 1) {
      rowY += 64;
      restoreFlow(context, rowY);
    }
  });
  restoreFlow(context, document.y + 4, "highlights");
}

function drawManagementSummary(context: PdfRenderContext, summary: string) {
  const { document, geometry } = context;
  document.font("Helvetica").fontSize(9);
  const textWidth = geometry.contentWidth - 24;
  const textHeight = document.heightOfString(summary, { width: textWidth });
  const boxHeight = Math.max(70, textHeight + 42);
  ensureSpace(context, boxHeight + 12);
  const y = document.y;
  document
    .roundedRect(geometry.contentLeft, y, geometry.contentWidth, boxHeight, 7)
    .fill("#eef0ff");
  document
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(INK)
    .text("MANAGEMENT SUMMARY", geometry.contentLeft + 12, y + 12, {
      width: textWidth
    });
  document
    .font("Helvetica")
    .fontSize(9)
    .fillColor(INK)
    .text(summary, geometry.contentLeft + 12, y + 30, { width: textWidth });
  restoreFlow(context, y + boxHeight + 12, "management-summary");
}

function drawComparison(
  context: PdfRenderContext,
  comparison: NonNullable<AdminReportDocument["comparison"]>
) {
  const columns = comparisonColumns(context.geometry.contentWidth);
  const firstRowHeight = comparisonRowHeight(context.document, comparison[0]!, columns);
  ensureSpace(
    context,
    sectionHeadingHeight(context, "Previous-period comparison") + 26 + firstRowHeight
  );
  sectionHeading(context, "Previous-period comparison");
  drawComparisonHeader(context, columns);
  for (const item of comparison) {
    const rowHeight = comparisonRowHeight(context.document, item, columns);
    if (ensureSpace(context, rowHeight)) {
      drawComparisonHeader(context, columns);
    }
    drawComparisonRow(context, item, columns, rowHeight);
  }
  restoreFlow(context, context.document.y + 8, "comparison");
}

function comparisonColumns(contentWidth: number): ComparisonColumn[] {
  return [
    { label: "Metric", width: contentWidth * 0.4, align: "left" },
    { label: "Current", width: contentWidth * 0.12, align: "right" },
    { label: "Previous", width: contentWidth * 0.12, align: "right" },
    { label: "Change", width: contentWidth * 0.13, align: "right" },
    { label: "Comparison", width: contentWidth * 0.23, align: "left" }
  ];
}

function drawComparisonHeader(context: PdfRenderContext, columns: ComparisonColumn[]) {
  const { document, geometry, diagnostics } = context;
  const y = document.y;
  document.rect(geometry.contentLeft, y, geometry.contentWidth, 24).fill("#eef0ff");
  let x = geometry.contentLeft;
  diagnostics.comparisonColumns = [];
  for (const column of columns) {
    diagnostics.comparisonColumns.push({ label: column.label, x, width: column.width });
    document
      .font("Helvetica-Bold")
      .fontSize(7.2)
      .fillColor(INK)
      .text(column.label, x + 6, y + 8, {
        width: column.width - 12,
        align: column.align,
        lineBreak: false
      });
    x += column.width;
  }
  restoreFlow(context, y + 24);
}

function comparisonRowHeight(
  document: PDFKit.PDFDocument,
  item: NonNullable<AdminReportDocument["comparison"]>[number],
  columns: ComparisonColumn[]
) {
  const values = comparisonValues(item);
  return Math.max(
    30,
    ...values.map((value, index) => {
      document.font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      return document.heightOfString(value, { width: columns[index]!.width - 12 }) + 12;
    })
  );
}

function drawComparisonRow(
  context: PdfRenderContext,
  item: NonNullable<AdminReportDocument["comparison"]>[number],
  columns: ComparisonColumn[],
  rowHeight: number
) {
  const { document, geometry } = context;
  const y = document.y;
  document
    .moveTo(geometry.contentLeft, y)
    .lineTo(geometry.contentRight, y)
    .strokeColor(BORDER)
    .stroke();
  let x = geometry.contentLeft;
  comparisonValues(item).forEach((value, index) => {
    const column = columns[index]!;
    document
      .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8)
      .fillColor(INK)
      .text(value, x + 6, y + 7, {
        width: column.width - 12,
        align: column.align
      });
    x += column.width;
  });
  context.diagnostics.comparisonRows.push({
    label: item.label,
    height: rowHeight,
    page: currentPageNumber(document)
  });
  restoreFlow(context, y + rowHeight);
}

function comparisonValues(
  item: NonNullable<AdminReportDocument["comparison"]>[number]
): string[] {
  return [
    item.label,
    formatValue(item.current),
    formatValue(item.previous),
    formatSigned(item.absoluteChange),
    item.percentageLabel
  ];
}

function drawSection(context: PdfRenderContext, section: ReportSection, brand: string) {
  const { document, geometry, diagnostics } = context;
  const movedToNewPage = ensureSpace(context, minimumSectionHeight(context, section));
  const headingPage = currentPageNumber(document);
  sectionHeading(context, section.title);
  const descriptionPage = section.description ? currentPageNumber(document) : null;
  if (section.description) {
    drawDescription(context, section.description);
  }

  let initialContentPage: number;
  if (section.rows.length) {
    initialContentPage = drawTable(context, section);
    drawSimpleBars(context, section.rows, brand, section.semantic);
  } else {
    initialContentPage = currentPageNumber(document);
    document
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        section.emptyMessage ?? "No persisted data matched this section.",
        geometry.contentLeft,
        document.y,
        { width: geometry.contentWidth }
      );
    restoreFlow(context, document.y + 8, "empty-section");
  }

  diagnostics.sections.push({
    title: section.title,
    titleX: geometry.contentLeft,
    descriptionX: section.description ? geometry.contentLeft : null,
    headingPage,
    descriptionPage,
    initialContentPage,
    movedToNewPage
  });
  restoreFlow(context, document.y, "section");
}

function minimumSectionHeight(context: PdfRenderContext, section: ReportSection) {
  const { document, geometry } = context;
  const heading = sectionHeadingHeight(context, section.title);
  document.font("Helvetica").fontSize(9);
  const description = section.description
    ? document.heightOfString(section.description, { width: geometry.contentWidth }) + 7
    : 0;
  if (!section.rows.length) {
    const empty = document.heightOfString(
      section.emptyMessage ?? "No persisted data matched this section.",
      { width: geometry.contentWidth }
    );
    return heading + description + empty + 12;
  }
  const table = prepareReportPdfTable(section);
  const columnWidths = tableColumnWidths(table, geometry.contentWidth);
  return (
    heading +
    description +
    tableHeaderHeight(document, table, columnWidths) +
    tableRowHeight(document, table, table.rows[0]!, columnWidths)
  );
}

function drawDescription(context: PdfRenderContext, description: string) {
  const { document, geometry } = context;
  document
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(description, geometry.contentLeft, document.y, {
      width: geometry.contentWidth
    });
  restoreFlow(context, document.y + 7, "description");
}

function isImportantFeedbackSection(section: ReportSection) {
  return (
    section.title === "Important customer experience feedback" &&
    section.headers.at(-1) === "Feedback"
  );
}

function isTrendSection(section: ReportSection) {
  return /trend/i.test(section.title) && section.headers[0] === "Period";
}

function tableColumnWidths(table: PreparedReportPdfTable, contentWidth: number) {
  if (table.columnProportions) {
    return table.columnProportions.map((proportion) => contentWidth * proportion);
  }
  return Array.from(
    { length: Math.max(1, table.headers.length) },
    () => contentWidth / Math.max(1, table.headers.length)
  );
}

export function prepareReportPdfTable(section: ReportSection): PreparedReportPdfTable {
  if (isImportantFeedbackSection(section) && section.headers.length === 9) {
    return {
      headers: section.headers,
      rows: section.rows.map((row) =>
        row.map((cell, index) =>
          index === row.length - 1 && typeof cell === "string"
            ? truncatePdfFeedbackExcerpt(cell)
            : cell
        )
      ),
      columnProportions: [0.11, 0.11, 0.1, 0.07, 0.08, 0.09, 0.06, 0.1, 0.28],
      fontSize: 6.7,
      wrapRows: true,
      semanticColumnIndex: 0
    };
  }

  if (section.title === "Integration connections" && section.headers.length === 8) {
    return {
      headers: [
        "Business",
        "Provider",
        "Mode",
        "State / health",
        "Imported",
        "Last activity",
        "Operational note"
      ],
      rows: section.rows.map((row) => [
        compactPdfExcerpt(row[0], 70),
        row[1] ?? null,
        row[2] ?? null,
        `${row[3] ?? "Not set"} / ${row[4] ?? "Not set"}`,
        row[5] ?? null,
        formatReportPdfTimestamp(row[6]),
        compactPdfExcerpt(row[7], 180)
      ]),
      columnProportions: [0.14, 0.12, 0.07, 0.14, 0.07, 0.16, 0.3],
      fontSize: 6.7,
      wrapRows: true,
      semanticColumnIndex: 3
    };
  }

  if (section.title === "Recent integration activity" && section.headers.length === 10) {
    return {
      headers: [
        "Requested",
        "Business",
        "Provider",
        "Mode",
        "Status",
        "Imported / failed",
        "Summary"
      ],
      rows: section.rows.map((row) => [
        formatReportPdfTimestamp(row[0]),
        compactPdfExcerpt(row[1], 70),
        row[2] ?? null,
        row[3] ?? null,
        row[4] ?? null,
        `${row[5] ?? 0} / ${row[8] ?? 0}`,
        compactPdfExcerpt(row[9], 180)
      ]),
      columnProportions: [0.16, 0.13, 0.11, 0.07, 0.12, 0.11, 0.3],
      fontSize: 6.7,
      wrapRows: true,
      semanticColumnIndex: 4
    };
  }

  if (section.title === "Recent webhook activity" && section.headers.length === 6) {
    return {
      headers: section.headers,
      rows: section.rows.map((row) => [
        formatReportPdfTimestamp(row[0]),
        compactPdfExcerpt(row[1], 70),
        row[2] ?? null,
        row[3] ?? null,
        compactPdfExcerpt(row[4], 60),
        compactPdfExcerpt(row[5], 180)
      ]),
      columnProportions: [0.16, 0.14, 0.11, 0.12, 0.13, 0.34],
      fontSize: 6.7,
      wrapRows: true,
      semanticColumnIndex: 3
    };
  }

  if (
    section.title === "Recent automation execution state" &&
    section.headers.length === 8
  ) {
    return {
      headers: [
        "Created",
        "Business",
        "Rule",
        "Status",
        "Matched",
        "Actions completed / skipped / failed"
      ],
      rows: section.rows.map((row) => [
        formatReportPdfTimestamp(row[0]),
        compactPdfExcerpt(row[1], 70),
        compactPdfExcerpt(row[2], 120),
        row[3] ?? null,
        row[4] ?? null,
        `${row[5] ?? 0} / ${row[6] ?? 0} / ${row[7] ?? 0}`
      ]),
      columnProportions: [0.17, 0.15, 0.25, 0.12, 0.09, 0.22],
      fontSize: 6.7,
      wrapRows: true,
      semanticColumnIndex: 3
    };
  }

  return {
    headers: section.headers,
    rows: section.rows,
    fontSize: 7.2,
    wrapRows: false,
    semanticColumnIndex: 0
  };
}

function tableRowHeight(
  document: PDFKit.PDFDocument,
  table: PreparedReportPdfTable,
  row: Array<string | number | null>,
  columnWidths: number[]
) {
  if (!table.wrapRows) return 27;
  document.font("Helvetica").fontSize(table.fontSize);
  return Math.max(
    30,
    ...row.map(
      (cell, index) =>
        document.heightOfString(String(cell ?? ""), {
          width: (columnWidths[index] ?? 0) - 8
        }) + 14
    )
  );
}

function tableHeaderHeight(
  document: PDFKit.PDFDocument,
  table: PreparedReportPdfTable,
  columnWidths: number[]
) {
  if (!table.wrapRows) return 24;
  document.font("Helvetica-Bold").fontSize(Math.max(table.fontSize, 6.7));
  return Math.max(
    24,
    ...table.headers.map(
      (header, index) =>
        document.heightOfString(header, { width: (columnWidths[index] ?? 0) - 8 }) + 12
    )
  );
}

function truncatePdfFeedbackExcerpt(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const maximum = 220;
  return normalized.length > maximum
    ? `${normalized.slice(0, maximum - 1)}\u2026`
    : normalized;
}

function compactPdfExcerpt(value: string | number | null | undefined, maximum: number) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > maximum
    ? `${normalized.slice(0, maximum - 1)}\u2026`
    : normalized;
}

export function formatReportPdfTimestamp(value: string | number | null | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value ?? "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  return `${String(parsed.getUTCDate()).padStart(2, "0")} ${months[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}, ${String(parsed.getUTCHours()).padStart(2, "0")}:${String(parsed.getUTCMinutes()).padStart(2, "0")}`;
}

function drawTable(context: PdfRenderContext, section: ReportSection) {
  const { document, geometry } = context;
  const table = prepareReportPdfTable(section);
  const columnWidths = tableColumnWidths(table, geometry.contentWidth);
  const visibleRows = isTrendSection(section) ? table.rows : table.rows.slice(0, 40);

  ensureSpace(context, 52);
  const initialContentPage = currentPageNumber(document);
  drawTableHeader(context, table, columnWidths);

  for (const [rowIndex, row] of visibleRows.entries()) {
    const rowHeight = tableRowHeight(document, table, row, columnWidths);
    if (ensureSpace(context, rowHeight)) {
      drawTableHeader(context, table, columnWidths);
    }
    const y = document.y;
    document
      .moveTo(geometry.contentLeft, y)
      .lineTo(geometry.contentRight, y)
      .strokeColor(BORDER)
      .stroke();
    const rowColor = semanticColor(
      String(row[table.semanticColumnIndex] ?? "")
        .split(" / ")
        .at(-1) ?? "",
      section.semantic
    );
    let x = geometry.contentLeft;
    row.forEach((cell, index) => {
      const columnWidth = columnWidths[index] ?? 0;
      document
        .font("Helvetica")
        .fontSize(table.fontSize)
        .fillColor(index === table.semanticColumnIndex && rowColor ? rowColor : INK)
        .text(String(cell ?? ""), x + 4, y + 7, {
          width: columnWidth - 8,
          height: rowHeight - 14,
          ellipsis: !table.wrapRows
        });
      x += columnWidth;
    });
    context.diagnostics.tableRows.push({
      sectionTitle: section.title,
      rowIndex,
      height: rowHeight,
      page: currentPageNumber(document)
    });
    restoreFlow(context, y + rowHeight);
  }
  if (section.rows.length > visibleRows.length) {
    document
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `${section.rows.length - visibleRows.length} additional rows are available in the CSV export.`,
        geometry.contentLeft,
        document.y,
        { width: geometry.contentWidth }
      );
  }
  restoreFlow(context, document.y + 8, "table");
  return initialContentPage;
}

function drawTableHeader(
  context: PdfRenderContext,
  table: PreparedReportPdfTable,
  columnWidths: number[]
) {
  const { document, geometry } = context;
  const y = document.y;
  const height = tableHeaderHeight(document, table, columnWidths);
  document.rect(geometry.contentLeft, y, geometry.contentWidth, height).fill("#eef0ff");
  let x = geometry.contentLeft;
  table.headers.forEach((header, index) => {
    const columnWidth = columnWidths[index] ?? 0;
    document
      .font("Helvetica-Bold")
      .fontSize(Math.max(table.fontSize, 6.7))
      .fillColor(INK)
      .text(header, x + 4, y + 6, {
        width: columnWidth - 8,
        height: height - 12,
        ellipsis: !table.wrapRows
      });
    x += columnWidth;
  });
  restoreFlow(context, y + height);
}

function drawSimpleBars(
  context: PdfRenderContext,
  rows: Array<Array<string | number | null>>,
  brand: string,
  semantic?: "SENTIMENT" | "HEALTH"
) {
  const { document, geometry } = context;
  if (
    !rows.length ||
    rows.length > 12 ||
    !rows.every((row) => typeof row[1] === "number")
  )
    return;
  const values = rows.map((row) => Number(row[1]));
  if (Math.max(...values) <= 0) return;
  const max = Math.max(...values);
  ensureSpace(context, rows.length * 17 + 28);
  document
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(MUTED)
    .text("VISUAL SUMMARY", geometry.contentLeft, document.y, {
      width: geometry.contentWidth
    });
  restoreFlow(context, document.y + 5);
  const labelWidth = 110;
  const valueWidth = 65;
  const barX = geometry.contentLeft + 114;
  const valueX = geometry.contentRight - valueWidth;
  const barWidth = Math.max(40, valueX - barX - 10);
  rows.forEach((row) => {
    const label = String(row[0] ?? "Not set");
    const value = Number(row[1]);
    const y = document.y;
    document
      .font("Helvetica")
      .fontSize(7)
      .fillColor(INK)
      .text(label, geometry.contentLeft, y, { width: labelWidth, ellipsis: true });
    document.roundedRect(barX, y + 1, barWidth, 7, 3).fill("#eceef3");
    document
      .roundedRect(barX, y + 1, Math.max(2, (value / max) * barWidth), 7, 3)
      .fill(semanticColor(label, semantic) ?? brand);
    document
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor(INK)
      .text(formatValue(value), valueX, y, { width: valueWidth, align: "right" });
    restoreFlow(context, y + 16);
  });
  restoreFlow(context, document.y + 7, "visual-summary");
}

function sectionHeading(context: PdfRenderContext, title: string) {
  const { document, geometry } = context;
  document
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(INK)
    .text(title, geometry.contentLeft, document.y, { width: geometry.contentWidth });
  restoreFlow(context, document.y + 8, "section-heading");
}

function sectionHeadingHeight(context: PdfRenderContext, title: string) {
  const { document, geometry } = context;
  document.font("Helvetica-Bold").fontSize(13);
  return document.heightOfString(title, { width: geometry.contentWidth }) + 8;
}

function ensureSpace(context: PdfRenderContext, height: number) {
  const { document, geometry } = context;
  restoreFlow(context, document.y);
  if (document.y + height <= geometry.contentBottom) return false;
  document.addPage();
  restoreFlow(context, geometry.contentTop);
  return true;
}

function restoreFlow(context: PdfRenderContext, y: number, helper?: string) {
  context.document.x = context.geometry.contentLeft;
  context.document.y = y;
  if (helper) {
    context.diagnostics.helperExits.push({ helper, x: context.document.x });
  }
}

function currentPageNumber(document: PDFKit.PDFDocument) {
  return document.bufferedPageRange().count;
}

function formatValue(value: string | number) {
  return typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : value;
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("en-US").format(value)}`;
}

function semanticColor(value: string, semantic?: "SENTIMENT" | "HEALTH") {
  const normalized = value.toUpperCase().replaceAll(" ", "_");
  if (semantic === "SENTIMENT") {
    if (normalized === "POSITIVE") return "#15803d";
    if (normalized === "NEGATIVE") return "#b91c1c";
    if (normalized === "MIXED") return "#b45309";
    return "#667085";
  }
  if (semantic === "HEALTH") {
    if (
      [
        "HEALTHY",
        "OPERATIONAL",
        "COMPLETED",
        "SUCCESS",
        "IMPORTED",
        "ACTIVE",
        "CONNECTED"
      ].includes(normalized)
    )
      return "#15803d";
    if (
      [
        "FAILED",
        "ERROR",
        "DEGRADED",
        "NEEDS_ATTENTION",
        "SUSPENDED",
        "REJECTED"
      ].includes(normalized)
    )
      return "#b91c1c";
    if (["PENDING", "PAUSED", "PROCESSING", "COMPLETED_WITH_ERRORS"].includes(normalized))
      return "#b45309";
    return "#667085";
  }
  return null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value)
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value));
}
