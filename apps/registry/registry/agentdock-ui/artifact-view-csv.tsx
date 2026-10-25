import { useMemo, useState } from "react";
import { parseCsv, sortCsvRows, CSV_PAGE_ROWS } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { Button } from "../ui/button.js";
export function ArtifactViewCsv({ artifact }: ArtifactViewerProps) {
  const parsed = useMemo(
    () =>
      parseCsv(
        artifact.content ?? "",
        /\.tsv$/i.test(artifact.id) ||
          artifact.mimeType === "text/tab-separated-values"
          ? "\t"
          : ",",
      ),
    [artifact.content, artifact.id, artifact.mimeType],
  );
  const [sort, setSort] = useState({ column: -1, descending: false });
  const [page, setPage] = useState(0);
  const rows = useMemo(
    () => sortCsvRows(parsed.rows.slice(1), sort.column, sort.descending),
    [parsed.rows, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / CSV_PAGE_ROWS));
  const current = Math.min(page, pages - 1);
  if (!parsed.rows.length)
    return (
      <p className="p-4 text-sm text-muted-foreground">This table is empty.</p>
    );
  return (
    <div className="p-3">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-left text-xs [&_td]:border-b [&_td]:border-border [&_td]:p-2">
          <caption className="sr-only">{artifact.title}</caption>
          <thead className="sticky top-0 bg-card">
            <tr>
              {parsed.rows[0].map((header, column) => (
                <th
                  key={column}
                  scope="col"
                  aria-sort={
                    sort.column === column
                      ? sort.descending
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  <Button
                    onClick={() => {
                      setSort({
                        column,
                        descending: sort.column === column && !sort.descending,
                      });
                      setPage(0);
                    }}
                  >
                    {header || `Column ${column + 1}`}
                    {sort.column === column
                      ? sort.descending
                        ? " ↓"
                        : " ↑"
                      : ""}
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .slice(current * CSV_PAGE_ROWS, (current + 1) * CSV_PAGE_ROWS)
              .map((row, i) => (
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
      <div className="mt-3 flex items-center justify-end gap-2 text-xs">
        <Button disabled={current === 0} onClick={() => setPage(current - 1)}>
          Previous
        </Button>
        <span aria-live="polite">
          {current + 1} / {pages}
        </span>
        <Button
          disabled={current + 1 >= pages}
          onClick={() => setPage(current + 1)}
        >
          Next
        </Button>
      </div>
      {parsed.truncated && (
        <p className="text-xs text-muted-foreground">
          Preview limited to 10,000 rows. Download for the full file.
        </p>
      )}
    </div>
  );
}
