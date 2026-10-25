import { parseTagAttributes } from "./tag-attributes.js";
import type { TaggedBlock } from "./tagged-types.js";
export interface Opening {
  tag: string;
  start: number;
  body: number;
  opening: string;
}
export function segment(
  text: string,
  block: Opening,
  state: TaggedBlock["state"],
  end: number,
  bodyEnd: number,
): TaggedBlock {
  return {
    kind: "block",
    tag: block.tag,
    attributes: parseTagAttributes(block.opening),
    body: text.slice(block.body, bodyEnd),
    state,
    raw: text.slice(block.start, end),
  };
}
