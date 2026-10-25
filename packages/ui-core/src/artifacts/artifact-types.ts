import type { RenderTool } from "../render-model.js";
export type ArtifactKind =
  | "html"
  | "markdown"
  | "json"
  | "code"
  | "csv"
  | "image"
  | "pdf"
  | "text"
  | "link"
  | "file";
export interface ArtifactDraft {
  id: string;
  title: string;
  content?: string;
  url?: string;
  mimeType?: string;
}
export interface ArtifactVersion {
  /** One-based, oldest first. */
  version: number;
  content?: string;
  url?: string;
  toolCallId: string;
  updatedAt?: string;
}
export interface Artifact extends ArtifactDraft {
  kind: ArtifactKind;
  versions: readonly ArtifactVersion[];
  sourceToolCallId?: string;
}
/** Return undefined for tools that do not produce displayable content. */
export type ArtifactMapper = (tool: RenderTool) => ArtifactDraft | undefined;
