import type { ContentPart } from "@agentdock-ai/contracts";
import type { RenderContentBlock, RenderMessageItem } from "./render-model.js";

/** Reconcile completion snapshots in place, including text split around tools. */
export function reconcileBlocks(
  segments: RenderMessageItem[],
  content: readonly ContentPart[],
  append: (part: ContentPart) => void,
): void {
  const blocks = segments.flatMap((s) => s.blocks);
  const used = new Set<string>();
  const normalized: ContentPart[] = [];
  for (const part of content) {
    const last = normalized.at(-1);
    if (
      (part.type === "text" || part.type === "reasoning") &&
      last?.type === part.type
    )
      normalized[normalized.length - 1] = {
        ...last,
        text: last.text + part.text,
      };
    else normalized.push(part);
  }
  let cursor = 0;
  const finalHasReasoning = normalized.some((p) => p.type === "reasoning");
  for (const part of normalized) {
    if (part.type === "tool-call" || part.type === "tool-result") {
      append(part);
      continue;
    }
    const start = blocks.findIndex(
      (b, i) => i >= cursor && !used.has(b.id) && b.type === part.type,
    );
    const candidates: RenderContentBlock[] = [];
    if (start >= 0)
      for (let i = start; i < blocks.length; i++) {
        const block = blocks[i]!;
        if (block.type !== part.type) {
          if (block.type === "reasoning" && !finalHasReasoning) continue;
          break;
        }
        candidates.push(block);
        cursor = i + 1;
        if (part.type !== "text" && part.type !== "reasoning") break;
      }
    if (!candidates.length) {
      append(part);
      continue;
    }
    if (part.type === "text" || part.type === "reasoning") {
      let remaining = part.text;
      for (const [i, block] of candidates.entries()) {
        if (block.type !== "text" && block.type !== "reasoning") continue;
        const text =
          i === candidates.length - 1
            ? remaining
            : remaining.slice(0, block.text.length);
        remaining = remaining.slice(text.length);
        Object.assign(block, { text });
        used.add(block.id);
      }
    } else {
      const block = candidates[0]!;
      Object.assign(block, part);
      used.add(block.id);
    }
  }
  // Keep reasoning omitted by a final answer snapshot; it is a separate content kind.
  const hasReasoning = normalized.some((p) => p.type === "reasoning");
  for (const segment of segments)
    segment.blocks = segment.blocks.filter(
      (b) =>
        !blocks.includes(b) ||
        used.has(b.id) ||
        (b.type === "reasoning" && !hasReasoning),
    ) as RenderContentBlock[];
}
