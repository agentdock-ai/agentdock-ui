import { CSV_MAX_ROWS } from "./artifact-limits.js";
export interface CsvResult {
  rows: string[][];
  truncated: boolean;
}
/** RFC 4180 quoted fields, including embedded line breaks and doubled quotes. */
export function parseCsv(
  text: string,
  delimiter = ",",
  maxRows = CSV_MAX_ROWS,
): CsvResult {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || field.length === 0) quoted = !quoted;
      else field += character;
    } else if (!quoted && character === delimiter) {
      row.push(field);
      field = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (rows.length >= maxRows)
        return { rows, truncated: i + 1 < text.length };
    } else field += character;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return { rows, truncated: false };
}
