import {
  Braces,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  Image,
  type LucideIcon,
} from "lucide-react";
import { codeLanguage, type Artifact } from "@agentdock-ai/ui-core";

const kinds: Record<Artifact["kind"], { icon: LucideIcon; label: string }> = {
  html: { icon: FileCode, label: "HTML" },
  markdown: { icon: FileText, label: "Markdown" },
  json: { icon: Braces, label: "JSON" },
  code: { icon: FileCode, label: "Code" },
  csv: { icon: FileSpreadsheet, label: "Table" },
  image: { icon: Image, label: "Image" },
  pdf: { icon: FileText, label: "PDF" },
  text: { icon: FileText, label: "Text" },
  link: { icon: Globe, label: "Web page" },
  file: { icon: File, label: "File" },
};

export const artifactIcon = (artifact: Pick<Artifact, "kind">) =>
  kinds[artifact.kind].icon;

/** "TypeScript", "HTML", "Web page"… for subtitles. */
export function artifactLabel(artifact: Pick<Artifact, "kind" | "id">) {
  const language = artifact.kind === "code" && codeLanguage(artifact.id);
  return language
    ? language.charAt(0).toUpperCase() + language.slice(1)
    : kinds[artifact.kind].label;
}
