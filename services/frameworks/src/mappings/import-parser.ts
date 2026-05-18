import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';

/**
 * Raw row read from a mapping import file. Header names are lowercased; values
 * are coerced to strings (empty cells become empty string). No validation —
 * the service layer resolves codes and reports per-row outcomes.
 */
export interface RawMappingRow {
  framework_code?: string;
  requirement_ref?: string;
  control_code?: string;
  mapping_type?: string;
  notes?: string;
  [key: string]: string | undefined;
}

const HEADER_KEYS = ['framework_code', 'requirement_ref', 'control_code', 'mapping_type', 'notes'];

/**
 * Parse a CSV buffer into raw mapping rows. Header row is required; columns
 * are matched by lowercased name. Extra columns are preserved on the row
 * object but ignored by the service. Empty lines are skipped; all values
 * are trimmed.
 */
export function parseMappingCsv(buffer: Buffer): RawMappingRow[] {
  const records = parse(buffer, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  return records.map((record) => normalizeRow(record));
}

/**
 * Parse an XLSX buffer into raw mapping rows. Reads the first worksheet only.
 * Row 1 is treated as the header (lowercased); subsequent rows are data.
 * Empty rows are skipped.
 */
export async function parseMappingXlsx(buffer: Buffer): Promise<RawMappingRow[]> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS types accept Buffer but TS's generic-typed Buffer<ArrayBufferLike> trips
  // the param signature. Pass the underlying ArrayBuffer view to satisfy both runtimes.
  await workbook.xlsx.load(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  );
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const v = cell.value;
    headers[colNumber - 1] =
      typeof v === 'string'
        ? v.trim().toLowerCase()
        : String(v ?? '')
            .trim()
            .toLowerCase();
  });

  const rows: RawMappingRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const record: Record<string, string> = {};
    let hasAny = false;
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      if (!key) continue;
      const cell = row.getCell(i + 1);
      const value = cellValueToString(cell.value);
      if (value !== '') hasAny = true;
      record[key] = value;
    }
    if (hasAny) rows.push(normalizeRow(record));
  });

  return rows;
}

function normalizeRow(record: Record<string, string>): RawMappingRow {
  const out: RawMappingRow = {};
  // Carry through known keys (so consumers get well-typed access), plus any extras.
  for (const key of HEADER_KEYS) {
    if (key in record) out[key] = (record[key] ?? '').trim();
  }
  for (const [k, v] of Object.entries(record)) {
    if (!HEADER_KEYS.includes(k)) {
      out[k] = typeof v === 'string' ? v.trim() : String(v ?? '').trim();
    }
  }
  return out;
}

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    // Rich text / formula / hyperlink etc.
    const obj = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (typeof obj.text === 'string') return obj.text.trim();
    if (Array.isArray(obj.richText))
      return obj.richText
        .map((rt) => rt.text)
        .join('')
        .trim();
    if (obj.result !== undefined) return String(obj.result).trim();
  }
  return String(value).trim();
}
