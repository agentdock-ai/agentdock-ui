"use client";
import type { ArtifactViewerProps } from "./artifact-types";
import { useArtifactCsv } from "./use-artifact-csv";
import { ArtifactCsvTable, ArtifactCsvPaging } from "./artifact-csv-table";
export function ArtifactViewCsv({ artifact }: ArtifactViewerProps) {
  const data = useArtifactCsv(artifact);
  if (!data.header)
    return (
      <p className="p-4 text-sm text-muted-foreground">This table is empty.</p>
    );
  return (
    <div className="p-3">
      <ArtifactCsvTable data={data} title={artifact.title} />
      <ArtifactCsvPaging data={data} />
      {data.truncated && (
        <p className="text-xs text-muted-foreground">
          Preview limited to 10,000 rows. Download for the full file.
        </p>
      )}
    </div>
  );
}
