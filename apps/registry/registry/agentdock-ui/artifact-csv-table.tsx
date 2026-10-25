"use client";
import { Button } from "../ui/button.js";
import type { useArtifactCsv } from "./use-artifact-csv.js";
type CsvState = ReturnType<typeof useArtifactCsv>;
function CsvHeader({ data }: { data: CsvState }) {
  return (
    <thead className="sticky top-0 bg-card">
      <tr>
        {data.header?.map((header, column) => (
          <th
            key={column}
            scope="col"
            aria-sort={
              data.sort.column === column
                ? data.sort.descending
                  ? "descending"
                  : "ascending"
                : "none"
            }
          >
            <Button onClick={() => data.sortBy(column)}>
              {header || `Column ${column + 1}`}
              {data.sort.column === column
                ? data.sort.descending
                  ? " ↓"
                  : " ↑"
                : ""}
            </Button>
          </th>
        ))}
      </tr>
    </thead>
  );
}
export function ArtifactCsvTable({
  data,
  title,
}: {
  data: CsvState;
  title: string;
}) {
  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="w-full border-collapse text-left text-xs [&_td]:border-b [&_td]:border-border [&_td]:p-2">
        <caption className="sr-only">{title}</caption>
        <CsvHeader data={data} />
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="max-w-80 break-words">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ArtifactCsvPaging({ data }: { data: CsvState }) {
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs">
      <Button disabled={data.current === 0} onClick={data.previous}>
        Previous
      </Button>
      <span aria-live="polite">
        {data.current + 1} / {data.pages}
      </span>
      <Button disabled={data.current + 1 >= data.pages} onClick={data.next}>
        Next
      </Button>
    </div>
  );
}
