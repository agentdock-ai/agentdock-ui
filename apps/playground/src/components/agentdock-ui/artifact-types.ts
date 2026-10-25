import type { ComponentType } from "react";
import type {
  Artifact,
  ArtifactKind,
  ArtifactMapper,
} from "@agentdock-ai/ui-core";
export type ArtifactMode = "preview" | "code" | "source" | "tree" | "raw";
export interface ArtifactViewerProps {
  artifact: Artifact;
  mode?: ArtifactMode;
  allowHtmlScripts?: boolean;
  canEmbed?: (url: string) => Promise<boolean>;
}
export type ArtifactViewer = ComponentType<ArtifactViewerProps>;
export interface ArtifactOptions {
  mapTool?: ArtifactMapper;
  viewers?: Partial<Record<ArtifactKind, ArtifactViewer>>;
  links?: "panel" | "tab";
  allowHtmlScripts?: boolean;
  canEmbed?: (url: string) => Promise<boolean>;
}
