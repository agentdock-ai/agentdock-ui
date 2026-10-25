"use client";
import { useArtifactHtmlLinks } from "./use-artifact-html-links";
export function ArtifactHtmlLinks({ content }: { content?: string }) {
  const links = useArtifactHtmlLinks(content);
  if (!links.size) return null;
  return (
    <nav
      aria-label="Links in HTML preview"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border p-3 text-xs"
    >
      <span className="text-muted-foreground">Links</span>
      {[...links].map(([href, label]) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-full break-words rounded underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
