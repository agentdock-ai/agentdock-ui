export interface TextMatch {
  text: string;
  match: boolean;
}
export function artifactTextMatches(text: string, query: string): TextMatch[] {
  if (!query) return [{ text, match: false }];
  const haystack = text.toLowerCase(),
    needle = query.toLowerCase();
  const parts: TextMatch[] = [];
  let start = 0,
    index = haystack.indexOf(needle);
  while (index >= 0 && parts.length < 2000) {
    if (index > start)
      parts.push({ text: text.slice(start, index), match: false });
    parts.push({ text: text.slice(index, index + query.length), match: true });
    start = index + query.length;
    index = haystack.indexOf(needle, start);
  }
  if (start < text.length)
    parts.push({ text: text.slice(start), match: false });
  return parts;
}
export function sortCsvRows(
  rows: readonly string[][],
  column: number,
  descending = false,
): string[][] {
  if (column < 0) return [...rows];
  const numeric = rows.every((row) => {
    const value = row[column] ?? "";
    return value.trim() !== "" && Number.isFinite(Number(value));
  });
  return [...rows].sort((a, b) => {
    const left = a[column] ?? "",
      right = b[column] ?? "";
    const order = numeric
      ? Number(left) - Number(right)
      : left.localeCompare(right);
    return descending ? -order : order;
  });
}
export function artifactBytes(content = ""): number {
  return new TextEncoder().encode(content).byteLength;
}
