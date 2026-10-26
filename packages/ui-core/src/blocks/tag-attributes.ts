/** Read quoted attributes without interpreting markup or escape sequences. Last value wins. */
export function parseTagAttributes(openingTag: string): Record<string, string> {
  const attributes: Record<string, string> = Object.create(null);
  const pattern = /([a-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of openingTag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3];
  }
  return attributes;
}
