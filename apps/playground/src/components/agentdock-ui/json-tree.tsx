"use client";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  jsonTree,
  visibleJsonNodes,
  type JsonTreeNode,
} from "@agentdock-ai/ui-core";
import { ChatIcon } from "./icon";
import { cn } from "./utils";

/** Colour by value type, always alongside the value itself. */
function valueClass(display: string) {
  if (display.startsWith('"')) return "text-emerald-700 dark:text-emerald-400";
  if (display === "true" || display === "false" || display === "null")
    return "text-amber-700 dark:text-amber-400";
  if (/^-?\d/.test(display)) return "text-blue-700 dark:text-blue-400";
  return "text-muted-foreground";
}

function TreeRow({
  node,
  expanded,
  toggle,
}: {
  node: JsonTreeNode;
  expanded: boolean;
  toggle: () => void;
}) {
  const indent = { paddingLeft: `${Math.min(node.depth, 12) * 16 + 4}px` };
  const label = <span className="text-foreground">{node.label}</span>;
  return (
    <li style={indent} className="[overflow-wrap:anywhere]">
      {node.branch ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={toggle}
          className="inline-flex items-center gap-1 rounded text-left outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChatIcon
            icon={ChevronRight}
            size={12}
            className={cn(
              "text-muted-foreground transition-transform motion-reduce:transition-none",
              expanded && "rotate-90",
            )}
          />
          {label}
          <span className="text-muted-foreground">{node.display}</span>
        </button>
      ) : (
        <span className="pl-4">
          {label}
          <span className="text-muted-foreground">: </span>
          <span className={valueClass(node.display)}>{node.display}</span>
        </span>
      )}
    </li>
  );
}

function toggled(current: Set<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function JsonTree({
  value,
  onRaw,
}: {
  value: unknown;
  onRaw?: () => void;
}) {
  const tree = useMemo(() => jsonTree(value), [value]);
  const [expanded, setExpanded] = useState(() => new Set(["0"]));
  const action =
    "rounded-md px-2 py-1 font-medium outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60";
  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
        <button
          type="button"
          className={action}
          onClick={() => setExpanded(new Set(tree.nodes.map((n) => n.id)))}
        >
          Expand all
        </button>
        <button
          type="button"
          className={action}
          onClick={() => setExpanded(new Set())}
        >
          Collapse all
        </button>
      </div>
      <ul
        aria-label="JSON tree"
        className="px-3 py-3 font-mono text-[12.5px] leading-6"
      >
        {visibleJsonNodes(tree.nodes, expanded).map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            expanded={expanded.has(node.id)}
            toggle={() => setExpanded((current) => toggled(current, node.id))}
          />
        ))}
      </ul>
      {tree.truncated && (
        <p className="px-4 pb-4 text-xs text-muted-foreground">
          Tree limited to 5,000 nodes and 64 levels.{" "}
          <button
            type="button"
            onClick={onRaw}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Show raw
          </button>
        </p>
      )}
    </div>
  );
}
