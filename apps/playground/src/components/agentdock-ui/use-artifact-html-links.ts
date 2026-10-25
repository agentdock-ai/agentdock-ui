"use client";
import { useEffect, useState } from "react";
import { safeUrl } from "./utils";
/** An inert template reads link labels without executing or attaching agent markup. */
function htmlLinks(content: string) {
  const template = document.createElement("template");
  template.innerHTML = content;
  const links = new Map<string, string>();
  for (const anchor of template.content.querySelectorAll(
    "a[href],area[href]",
  )) {
    const href = safeUrl(anchor.getAttribute("href") ?? undefined);
    if (href && /^https?:/i.test(href))
      links.set(
        href,
        anchor.textContent?.trim() || anchor.getAttribute("alt") || href,
      );
  }
  return links;
}
export function useArtifactHtmlLinks(content = "") {
  const [state, setState] = useState<{
    content: string;
    links: ReadonlyMap<string, string>;
  }>();
  useEffect(() => {
    setState({ content, links: htmlLinks(content) });
  }, [content]);
  return state?.content === content ? state.links : new Map<string, string>();
}
