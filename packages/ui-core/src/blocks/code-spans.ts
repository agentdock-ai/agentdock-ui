import { scanFence, type TaggedFence } from "./tagged-fence.js";
type CodeSpan = readonly [start: number, end: number];
function escaped(text: string, offset: number) {
  let slashes = 0;
  while (offset > 0 && text[--offset] === "\\") slashes++;
  return slashes % 2 === 1;
}
function paragraphSpans(text: string, start: number): CodeSpan[] {
  const ticks = [...text.matchAll(/`+/g)];
  const closing = new Map<number, number>();
  const next = ticks.map(() => -1);
  for (let i = ticks.length - 1; i >= 0; i--) {
    const length = ticks[i][0].length;
    next[i] = closing.get(length) ?? -1;
    closing.set(length, i);
  }
  const spans: CodeSpan[] = [];
  for (let i = 0; i < ticks.length; i++) {
    const open = ticks[i];
    if (escaped(text, open.index) || next[i] < 0) continue;
    const close = ticks[next[i]];
    spans.push([start + open.index, start + close.index + close[0].length]);
    i = next[i];
  }
  return spans;
}
/** Code spans can cross soft line breaks, but not paragraphs or fenced blocks. */
function codeSpans(text: string) {
  const spans: CodeSpan[] = [];
  let fence: TaggedFence | undefined;
  let paragraph = 0,
    offset = 0;
  for (const source of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const line = source.replace(/\r?\n$/, "");
    const scanned = scanFence(line, fence);
    fence = scanned.fence;
    if (scanned.skip || !line.trim()) {
      for (const span of paragraphSpans(
        text.slice(paragraph, offset),
        paragraph,
      ))
        spans.push(span);
      paragraph = offset + source.length;
    }
    offset += source.length;
  }
  return [...spans, ...paragraphSpans(text.slice(paragraph), paragraph)];
}
/** The line scanner advances monotonically, so each protected interval is visited once. */
export function codeSpanGuard(text: string) {
  const spans = codeSpans(text);
  let index = 0;
  return (offset: number) => {
    while (index < spans.length && spans[index][1] <= offset) index++;
    return index < spans.length && spans[index][0] <= offset;
  };
}
