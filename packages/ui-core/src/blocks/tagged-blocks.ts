import { codeSpanGuard } from "./code-spans.js";
import { segment, type Opening } from "./tagged-segment.js";
import { scanFence, type TaggedFence } from "./tagged-fence.js";
import type { TaggedSegment, TaggedBlockOptions } from "./tagged-types.js";
export type {
  TaggedBlock,
  TaggedSegment,
  TaggedBlockOptions,
} from "./tagged-types.js";
class TaggedScanner {
  readonly segments: TaggedSegment[] = [];
  private fence?: TaggedFence;
  private block?: Opening;
  private offset = 0;
  private markdownStart = 0;
  private inCodeSpan: (offset: number) => boolean;
  constructor(
    private text: string,
    private options: TaggedBlockOptions,
  ) {
    this.inCodeSpan = codeSpanGuard(text);
  }
  read(source: string) {
    const line = source.replace(/\r?\n$/, "");
    const block = this.block;
    if (block) {
      if (line.trim() === `</${block.tag}>`) {
        this.segments.push(
          segment(
            this.text,
            block,
            "complete",
            this.offset + source.length,
            this.offset,
          ),
        );
        this.block = undefined;
        this.markdownStart = this.offset + source.length;
      }
    } else this.readOpening(line, source.length);
    this.offset += source.length;
  }
  private readOpening(line: string, length: number) {
    const scanned = scanFence(line, this.fence);
    this.fence = scanned.fence;
    if (scanned.skip || this.inCodeSpan(this.offset)) return;
    const opening = /^\s*<([a-z][a-z0-9-]*)(?:\s+[^<>]*)?>\s*$/.exec(line);
    if (!opening || !(this.options.tags ?? ["chart"]).includes(opening[1]))
      return;
    if (this.offset > this.markdownStart)
      this.segments.push({
        kind: "markdown",
        text: this.text.slice(this.markdownStart, this.offset),
      });
    this.block = {
      tag: opening[1],
      start: this.offset,
      body: this.offset + length,
      opening: line,
    };
  }
  finish() {
    if (this.block)
      this.segments.push(
        segment(
          this.text,
          this.block,
          this.options.streaming ? "streaming" : "unterminated",
          this.text.length,
          this.text.length,
        ),
      );
    else if (this.markdownStart < this.text.length)
      this.segments.push({
        kind: "markdown",
        text: this.text.slice(this.markdownStart),
      });
    return this.segments;
  }
}
/** Extract line-delimited blocks, preserving all other bytes, including CRLF. */
export function parseTaggedBlocks(
  text: string,
  options: TaggedBlockOptions,
): TaggedSegment[] {
  const scanner = new TaggedScanner(text, options);
  for (const source of text.match(/[^\n]*\n|[^\n]+$/g) ?? [])
    scanner.read(source);
  return scanner.finish();
}
