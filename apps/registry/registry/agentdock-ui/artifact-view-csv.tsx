"use client";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { CSV_PAGE_ROWS, parseCsv, sortCsvRows } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";

const numeric = (value = "") =>
  value.trim() !== "" && Number.isFinite(Number(value));

export function ArtifactViewCsv({ artifact }: ArtifactViewerProps) {
  const tsv =
    /\.tsv$/i.test(artifact.id) ||
    artifact.mimeType === "text/tab-separated-values";
  const parsed = useMemo(
    () => parseCsv(artifact.content ?? "", tsv ? "\t" : ","),
    [artifact.content, tsv],
  );
  const [sort, setSort] = useState({ column: -1, descending: false });
  const [page, setPage] = useState(0);
  const sorted = useMemo(
    () => sortCsvRows(parsed.rows.slice(1), sort.column, sort.descending),
    [parsed.rows, sort],
  );
  const header = parsed.rows[0];
  if (!header)
    return (
      <p className="p-6 text-sm text-muted-foreground">This table is empty.</p>
    );
  const pages = Math.max(1, Math.ceil(sorted.length / CSV_PAGE_ROWS));
  const current = Math.min(page, pages - 1);
  const rows = sorted.slice(
    current * CSV_PAGE_ROWS,
    (current + 1) * CSV_PAGE_ROWS,
  );
  const sortBy = (column: number) => {
    setSort({
      column,
      descending: sort.column === column && !sort.descending,
    });
    setPage(0);
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-[12.5px]">
          <caption className="sr-only">{artifact.title}</caption>
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr>
              {header.map((name, column) => (
                <th
                  key={column}
                  scope="col"
                  aria-sort={
                    sort.column !== column
                      ? "none"
                      : sort.descending
                        ? "descending"
                        : "ascending"
                  }
                  className="border-b border-border p-0 font-medium"
                >
                  <button
                    type="button"
                    onClick={() => sortBy(column)}
                    className="flex w-full items-center gap-1 whitespace-nowrap px-3 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60"
                  >
                    {name || `Column ${column + 1}`}
                    {sort.column === column && (
                      <ChatIcon
                        icon={sort.descending ? ArrowDown : ArrowUp}
                        size={12}
                      />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="even:bg-muted/30 hover:bg-muted/50">
                {header.map((_, j) => (
                  <td
                    key={j}
                    className={`max-w-80 border-b border-border/60 px-3 py-1.5 break-words ${numeric(row[j]) ? "text-right tabular-nums" : ""}`}
                  >
                    {row[j]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>
          {sorted.length.toLocaleString()} rows
          {parsed.truncated && " · preview limited to 10,000 rows"}
        </span>
        {pages > 1 && (
          <span className="flex items-center gap-2">
            <Button
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <span aria-live="polite" className="tabular-nums">
              {current + 1} / {pages}
            </span>
            <Button
              disabled={current + 1 >= pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </span>
        )}
      </footer>
    </div>
  );
}
