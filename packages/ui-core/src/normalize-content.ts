import type { ContentPart } from "@agentdock-ai/contracts";

/** Combine adjacent streamed text of the same kind without reordering content. */
export function normalizeContent(parts: readonly ContentPart[]): ContentPart[] {
  const normalized: ContentPart[] = [];
  for (const part of parts) {
    const last = normalized.at(-1);
    if (
      (part.type === "text" || part.type === "reasoning") &&
      last?.type === part.type
    ) {
      normalized[normalized.length - 1] = {
        ...last,
        text: last.text + part.text,
      };
    } else normalized.push(part);
  }
  return normalized;
}
