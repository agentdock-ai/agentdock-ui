import { useMemo, type ReactNode } from "react";
import { useAgentState } from "@agentdock-ai/react";
import { projectArtifacts } from "@agentdock-ai/ui-core";
import type { ArtifactOptions } from "./artifact-types.js";
import { ArtifactProvider } from "./artifact-context.js";
import { ChatSplit } from "./chat-split.js";
import { ArtifactPanel } from "./artifact-panel.js";
import { ArtifactView } from "./artifact-view.js";
export function ChatArtifacts({
  options,
  children,
}: {
  options?: ArtifactOptions;
  children: ReactNode;
}) {
  const { renderModel } = useAgentState();
  const artifacts = useMemo(
    () => (options ? projectArtifacts(renderModel, options.mapTool) : []),
    [renderModel, options?.mapTool, Boolean(options)],
  );
  if (!options) return children;
  return (
    <ArtifactProvider artifacts={artifacts} options={options}>
      <ChatSplit
        panel={
          <ArtifactPanel
            render={(artifact, mode) => (
              <ArtifactView
                artifact={artifact}
                mode={mode}
                viewers={options.viewers}
                allowHtmlScripts={options.allowHtmlScripts}
                canEmbed={options.canEmbed}
              />
            )}
          />
        }
      >
        {children}
      </ChatSplit>
    </ArtifactProvider>
  );
}
