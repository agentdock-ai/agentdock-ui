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
  /** Recognised tags; unregistered markup stays Markdown. */ tags?: readonly string[];
}
