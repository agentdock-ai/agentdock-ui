import type {
  AgentReducerState,
  AgentToolProgress,
  ToolCallRecord,
  ToolErrorRecord,
  ToolResultRecord,
} from "@agentdock-ai/ui-core";
import { Wrench } from "lucide-react";
import { cn } from "../ui/class-names.js";

export interface AgentToolActivityItem {
  call: ToolCallRecord;
  runId: string | null;
  result?: ToolResultRecord;
  error?: ToolErrorRecord;
  progress?: AgentToolProgress;
}

export interface AgentToolActivityClassNames {
  root?: string;
  label?: string;
  card?: string;
  top?: string;
  icon?: string;
  info?: string;
  state?: string;
  detail?: string;
  progress?: string;
}

export interface AgentToolActivityProps {
  runs: readonly AgentReducerState[];
  className?: string;
  classNames?: AgentToolActivityClassNames;
}

export function AgentToolActivity({
  runs,
  className,
  classNames,
}: AgentToolActivityProps) {
  const tools = runs.flatMap((run) =>
    run.toolCalls.map((call) => ({
      call,
      runId: run.runId,
      result: run.toolResults.find((item) => item.toolCallId === call.toolCallId),
      error: run.toolErrors.find((item) => item.toolCallId === call.toolCallId),
      progress: run.toolProgress.find((item) => item.toolCallId === call.toolCallId),
    })),
  );

  if (tools.length === 0) return null;

  return (
    <section className={cn("ad-tool-section", className, classNames?.root)} aria-label="Tool activity" data-slot="tool-activity">
      <div className={cn("ad-section-label", classNames?.label)}>TOOL CALLS</div>
      {tools.map(({ call, runId, result, error, progress }) => (
        <article className={cn("ad-tool-card", classNames?.card)} key={(runId ?? "run") + "-" + call.toolCallId}>
          <div className={cn("ad-tool-top", classNames?.top)}>
            <span className={cn("ad-tool-icon", classNames?.icon)} aria-hidden="true"><Wrench /></span>
            <div className={cn("ad-tool-info", classNames?.info)}>
              <strong>{call.name}</strong>
              <span>{error ? "Failed" : result ? "Completed" : progress ? "In progress" : "Started"}</span>
            </div>
            <span className={cn("ad-tool-state", error ? "is-error" : result ? "is-done" : undefined, classNames?.state)}>
              {error ? "Failed" : result ? "Done" : "Running"}
            </span>
          </div>
          <details className={cn("ad-tool-detail", classNames?.detail)}>
            <summary>Input</summary>
            <pre>{JSON.stringify(call.input, null, 2)}</pre>
          </details>
          {progress && <div className={cn("ad-tool-progress", classNames?.progress)}>{progress.content.map((part, index) => part.type === "text" ? <span key={index}>{part.text}</span> : null)}</div>}
          {result && <details className={cn("ad-tool-detail", classNames?.detail)}><summary>Result</summary><pre>{JSON.stringify(result.output, null, 2)}</pre></details>}
          {error && <details className={cn("ad-tool-detail", classNames?.detail)} open><summary>Error</summary><pre>{error.error}</pre></details>}
        </article>
      ))}
    </section>
  );
}
