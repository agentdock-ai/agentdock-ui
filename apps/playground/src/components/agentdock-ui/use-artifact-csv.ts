"use client";
import { useMemo, useState } from "react";
import {
  parseCsv,
  sortCsvRows,
  CSV_PAGE_ROWS,
  type Artifact,
} from "@agentdock-ai/ui-core";
export function useArtifactCsv(artifact: Artifact) {
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
  const [sort, setSort] = useState({ column: -1, descending: false }),
    [page, setPage] = useState(0);
  const rows = useMemo(
    () => sortCsvRows(parsed.rows.slice(1), sort.column, sort.descending),
    [parsed.rows, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / CSV_PAGE_ROWS)),
    current = Math.min(page, pages - 1);
  return {
    header: parsed.rows[0],
    rows: rows.slice(current * CSV_PAGE_ROWS, (current + 1) * CSV_PAGE_ROWS),
    truncated: parsed.truncated,
    pages,
    current,
    sort,
    sortBy(column: number) {
      setSort({
        column,
        descending: sort.column === column && !sort.descending,
      });
      setPage(0);
    },
    previous: () => setPage(current - 1),
    next: () => setPage(current + 1),
  };
}
