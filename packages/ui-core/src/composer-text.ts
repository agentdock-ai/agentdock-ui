export interface DraftInsertion {
  text: string;
  cursor: number;
}
/** Insert into the current selection, adding word boundaries without submitting the draft. */
export function insertDraftText(
  draft: string,
  transcript: string,
  start = draft.length,
  end = start,
): DraftInsertion {
  const value = transcript.trim();
  const position = Math.max(0, Math.min(draft.length, start));
  if (!value) return { text: draft, cursor: position };
  const before = draft.slice(0, position),
    after = draft.slice(Math.max(position, Math.min(draft.length, end)));
  const prefix = before && !/\s$/.test(before) ? " " : "";
  const suffix = after && !/^\s/.test(after) ? " " : "";
  return {
    text: `${before}${prefix}${value}${suffix}${after}`,
    cursor: before.length + prefix.length + value.length + suffix.length,
  };
}
