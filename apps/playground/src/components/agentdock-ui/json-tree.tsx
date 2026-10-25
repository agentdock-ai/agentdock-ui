import { useMemo, useState } from "react";
import { jsonTree, visibleJsonNodes } from "@agentdock-ai/ui-core";
import { Button } from "./ui/button";
export function JsonTree({
  value,
  onRaw,
}: {
  value: unknown;
  onRaw?: () => void;
}) {
  const tree = useMemo(() => jsonTree(value), [value]);
  const [expanded, setExpanded] = useState(() => new Set(["0"]));
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
          <li
            key={node.id}
            style={{ paddingLeft: `${Math.min(node.depth, 12) * 16}px` }}
            className="[overflow-wrap:anywhere]"
          >
            {node.branch ? (
              <button
                type="button"
                aria-expanded={expanded.has(node.id)}
                onClick={() =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(node.id)) next.delete(node.id);
                    else next.add(node.id);
                    return next;
                  })
                }
                className="rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {expanded.has(node.id) ? "▾" : "▸"} {node.label}:{" "}
                <span className="text-muted-foreground">{node.display}</span>
              </button>
            ) : (
              <span className="pl-4">
                {node.label}: {node.display}
              </span>
            )}
          </li>
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
