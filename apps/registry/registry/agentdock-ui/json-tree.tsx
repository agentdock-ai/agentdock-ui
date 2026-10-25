"use client";
import { useMemo, useState } from "react";
import {
  jsonTree,
  visibleJsonNodes,
  type JsonTreeNode,
} from "@agentdock-ai/ui-core";
import { Button } from "../ui/button.js";
interface TreeRowProps {
  node: JsonTreeNode;
  expanded: boolean;
  toggle: () => void;
}
function TreeRow({ node, expanded, toggle }: TreeRowProps) {
  return (
    <li
      style={{ paddingLeft: `${Math.min(node.depth, 12) * 16}px` }}
      className="[overflow-wrap:anywhere]"
    >
      {node.branch ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={toggle}
          className="rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "▾" : "▸"} {node.label}:{" "}
          <span className="text-muted-foreground">{node.display}</span>
        </button>
      ) : (
        <span className="pl-4">
          {node.label}: {node.display}
        </span>
      )}
    </li>
  );
}
interface JsonTreeProps {
  value: unknown;
  onRaw?: () => void;
}
function toggleExpanded(current: Set<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
export function JsonTree({ value, onRaw }: JsonTreeProps) {
  const tree = useMemo(() => jsonTree(value), [value]);
  const [expanded, setExpanded] = useState(() => new Set(["0"]));
  const toggle = (id: string) =>
    setExpanded((current) => toggleExpanded(current, id));
  return (
    <div className="p-3">
      <div className="mb-2 flex gap-1">
        <Button
          onClick={() => setExpanded(new Set(tree.nodes.map((n) => n.id)))}
        >
          Expand all
        </Button>
        <Button onClick={() => setExpanded(new Set())}>Collapse all</Button>
      </div>
      <ul aria-label="JSON tree" className="font-mono text-xs leading-6">
        {visibleJsonNodes(tree.nodes, expanded).map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            expanded={expanded.has(node.id)}
            toggle={() => toggle(node.id)}
          />
        ))}
      </ul>
      {tree.truncated && (
        <p className="mt-3 text-xs text-muted-foreground">
          Tree limited to 5,000 nodes and 64 levels.{" "}
          <button type="button" onClick={onRaw} className="underline">
            Show raw
          </button>
        </p>
      )}
    </div>
  );
}
