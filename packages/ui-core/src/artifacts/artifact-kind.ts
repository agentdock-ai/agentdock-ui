import type { ArtifactKind } from "./artifact-types.js";
const extensions: Record<string, ArtifactKind> = {
  html: "html",
  htm: "html",
  md: "markdown",
  mdx: "markdown",
  json: "json",
  csv: "csv",
  tsv: "csv",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  avif: "image",
  svg: "image",
  ico: "image",
  pdf: "pdf",
  txt: "text",
  log: "text",
};
const languages: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  css: "css",
  scss: "scss",
  sh: "shell",
  bash: "shell",
  sql: "sql",
  yml: "yaml",
  yaml: "yaml",
  xml: "xml",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  rb: "ruby",
  php: "php",
};
function extension(path = "") {
  return path.split(/[?#]/)[0].split(".").at(-1)?.toLowerCase() ?? "";
}
export function codeLanguage(path?: string): string | undefined {
  return languages[extension(path)];
}
export function artifactKind(
  path?: string,
  mimeType?: string,
  url?: string,
): ArtifactKind {
  const mime = mimeType?.split(";")[0].trim().toLowerCase();
  if (mime?.startsWith("image/")) return "image";
  const mimes: Record<string, ArtifactKind> = {
    "text/html": "html",
    "text/markdown": "markdown",
    "application/json": "json",
    "text/csv": "csv",
    "text/tab-separated-values": "csv",
    "application/pdf": "pdf",
    "text/plain": "text",
    "text/javascript": "code",
    "application/javascript": "code",
  };
  if (mime && mimes[mime]) return mimes[mime];
  const ext = extension(path || url);
  if (extensions[ext]) return extensions[ext];
  if (languages[ext]) return "code";
  return url ? "link" : "file";
}
