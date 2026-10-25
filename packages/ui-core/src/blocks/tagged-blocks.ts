import { parseTagAttributes } from "./tag-attributes.js";
import { scanFence, type TaggedFence } from "./tagged-fence.js";

export interface TaggedBlock {
  kind: "block";
  tag: string;
  attributes: Record<string, string>;
  body: string;
  state: "complete" | "streaming" | "unterminated";
  /** Exact source retained for the fallback viewer. */
  raw: string;
}
export type TaggedSegment = { kind: "markdown"; text: string } | TaggedBlock;
export interface TaggedBlockOptions {
  streaming: boolean;
  /** Recognised tags; unregistered markup stays in Markdown. */
  tags?: readonly string[];
}

/** Extract line-delimited blocks, preserving all other source bytes including CRLF. */
export function parseTaggedBlocks(
  text: string,
  { streaming, tags = ["chart"] }: TaggedBlockOptions,
): TaggedSegment[] {
  const segments: TaggedSegment[] = [];
  let fence: TaggedFence | undefined;
  let block:
    { tag: string; start: number; body: number; opening: string } | undefined;
  let offset = 0;
  let markdownStart = 0;
  for (const source of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const line = source.replace(/\r?\n$/, "");
    if (block) {
      if (line.trim() === `</${block.tag}>`) {
        segments.push({
          kind: "block",
          tag: block.tag,
          attributes: parseTagAttributes(block.opening),
          body: text.slice(block.body, offset),
          state: "complete",
          raw: text.slice(block.start, offset + source.length),
        });
        block = undefined;
        markdownStart = offset + source.length;
      }
    } else {
      const scanned = scanFence(line, fence);
      fence = scanned.fence;
      if (!scanned.skip) {
        const opening = /^\s*<([a-z][a-z0-9-]*)(?:\s+[^<>]*)?>\s*$/.exec(line);
        if (opening && tags.includes(opening[1])) {
          if (offset > markdownStart)
            segments.push({
              kind: "markdown",
              text: text.slice(markdownStart, offset),
            });
          block = {
            tag: opening[1],
            start: offset,
            body: offset + source.length,
            opening: line,
          };
        }
      }
    }
    offset += source.length;
  }
  if (block)
    segments.push({
      kind: "block",
      tag: block.tag,
      attributes: parseTagAttributes(block.opening),
      body: text.slice(block.body),
      state: streaming ? "streaming" : "unterminated",
      raw: text.slice(block.start),
    });
  else if (markdownStart < text.length)
    segments.push({ kind: "markdown", text: text.slice(markdownStart) });
  return segments;
}
