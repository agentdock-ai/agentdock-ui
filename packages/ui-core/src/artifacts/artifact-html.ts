const base = '<base target="_blank">';

/**
 * Make agent HTML safe to preview in a sandboxed frame: links open in a new tab.
 * The base tag goes inside <head> (or after the doctype) so the page keeps
 * standards mode; anything before a doctype would switch it to quirks mode.
 */
export function htmlPreviewDocument(content = ""): string {
  const head = /<head(\s[^>]*)?>/i.exec(content);
  if (head)
    return `${content.slice(0, head.index + head[0].length)}${base}${content.slice(head.index + head[0].length)}`;
  const doctype = /^\s*<!doctype[^>]*>/i.exec(content);
  if (doctype) return `${doctype[0]}${base}${content.slice(doctype[0].length)}`;
  return `${base}${content}`;
}

/** Popups may leave the sandbox so links work; scripts stay off unless the host allows them. */
export function htmlPreviewSandbox(allowScripts = false): string {
  return `${allowScripts ? "allow-scripts " : ""}allow-popups allow-popups-to-escape-sandbox`;
}
