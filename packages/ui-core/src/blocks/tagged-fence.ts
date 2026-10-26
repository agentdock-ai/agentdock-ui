export interface TaggedFence {
  character: string;
  length: number;
}
/** Closing fences must match the opening character and be at least as long. */
export function scanFence(
  line: string,
  fence?: TaggedFence,
): { fence?: TaggedFence; skip: boolean } {
  const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if (fence) {
    const closed =
      marker &&
      marker[1][0] === fence.character &&
      marker[1].length >= fence.length &&
      !marker[2].trim();
    return { fence: closed ? undefined : fence, skip: true };
  }
  return marker
    ? {
        fence: { character: marker[1][0], length: marker[1].length },
        skip: true,
      }
    : { skip: false };
}
