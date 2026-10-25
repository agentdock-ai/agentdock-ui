import { JSON_MAX_NODES } from "./artifact-limits.js";
export interface JsonTreeNode {
  id: string;
  parent?: string;
  label: string;
  display: string;
  depth: number;
  branch: boolean;
}
export interface JsonTreeResult {
  nodes: JsonTreeNode[];
  truncated: boolean;
}
export function parseArtifactJson(
  content: string,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  try {
    return { ok: true, value: JSON.parse(content) };
  } catch {
    return { ok: false, reason: "This file does not contain valid JSON." };
  }
}
/** Iterative traversal bounds both total nodes and nesting, including Expand all. */
export function jsonTree(
  value: unknown,
  limit = JSON_MAX_NODES,
): JsonTreeResult {
  const nodes: JsonTreeNode[] = [];
  const pending = [
    {
      value,
      label: "root",
      id: "0",
      parent: undefined as string | undefined,
      depth: 0,
    },
  ];
  let truncated = false;
  while (pending.length && nodes.length < limit) {
    const node = pending.pop();
    if (!node) break;
    const entries =
      node.value !== null && typeof node.value === "object"
        ? Object.entries(node.value)
        : [];
    const display = Array.isArray(node.value)
      ? `Array(${node.value.length})`
      : entries.length
        ? "{…}"
        : typeof node.value === "object" && node.value !== null
          ? "{}"
          : JSON.stringify(node.value);
    nodes.push({
      id: node.id,
      parent: node.parent,
      label: node.label,
      display,
      depth: node.depth,
      branch: entries.length > 0,
    });
    const available =
      node.depth < 64 ? Math.max(0, limit - nodes.length - pending.length) : 0;
    if (entries.length > available) truncated = true;
    for (let i = Math.min(entries.length, available) - 1; i >= 0; i--) {
      const [label, child] = entries[i];
      pending.push({
        value: child,
        label,
        id: `${node.id}.${i}`,
        parent: node.id,
        depth: node.depth + 1,
      });
    }
  }
  return { nodes, truncated: truncated || pending.length > 0 };
}
export function visibleJsonNodes(
  nodes: readonly JsonTreeNode[],
  expanded: ReadonlySet<string>,
): JsonTreeNode[] {
  const visible = new Set<string>();
  return nodes.filter((node) => {
    if (
      node.parent !== undefined &&
      (!visible.has(node.parent) || !expanded.has(node.parent))
    )
      return false;
    visible.add(node.id);
    return true;
  });
}
