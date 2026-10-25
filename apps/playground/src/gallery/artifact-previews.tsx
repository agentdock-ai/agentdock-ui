import { useMemo, useState } from "react";
import {
  ArtifactProvider,
  useArtifacts,
} from "../components/agentdock-ui/artifact-context";
import { ArtifactPanel } from "../components/agentdock-ui/artifact-panel";
import { ArtifactView } from "../components/agentdock-ui/artifact-view";
import { ChatSplit } from "../components/agentdock-ui/chat-split";
import { Chat } from "../components/agentdock-ui/chat";
import { Button } from "../components/agentdock-ui/ui/button";
import { ComponentPreview } from "./component-preview";
import {
  artifactFixtures,
  createArtifactPreviewStore,
} from "./artifact-fixtures";
import { createFixtureChatAdapter } from "../adapter/create-fixture-chat-adapter";
function PanelControls() {
  const context = useArtifacts();
  return (
    <ChatSplit
      panel={
        <ArtifactPanel
          render={(artifact, mode) => (
            <ArtifactView artifact={artifact} mode={mode} />
          )}
        />
      }
    >
      <div className="p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Open files in tabs, choose a version, or resize the panel.
        </p>
        {artifactFixtures.slice(0, 4).map((a) => (
          <Button key={a.id} onClick={() => context?.open(a.id)}>
            Open {a.title}
          </Button>
        ))}
      </div>
    </ChatSplit>
  );
}
function ArtifactChatPreview() {
  const [store] = useState(createArtifactPreviewStore);
  const adapter = useMemo(() => createFixtureChatAdapter(store), [store]);
  return (
    <Chat store={store} adapter={adapter} artifacts={{ links: "panel" }} />
  );
}
export function ArtifactPreviews() {
  return (
    <section
      id="artifacts"
      className="gallery-category"
      aria-labelledby="artifacts-heading"
    >
      <h2 id="artifacts-heading">Artifacts</h2>
      <div className="gallery-grid">
        <ComponentPreview
          name="Artifact panel · Tabs and versions"
          wide
          className="gallery-layout-preview"
        >
          <ArtifactProvider artifacts={artifactFixtures}>
            <PanelControls />
          </ArtifactProvider>
        </ComponentPreview>
        <ComponentPreview
          name="Chat · File versions"
          wide
          className="gallery-chat-preview"
        >
          <ArtifactChatPreview />
        </ComponentPreview>
        <StandaloneArtifacts />
        <ComponentPreview name="Link · Framing blocked">
          <div className="h-96 w-full">
            <ArtifactView
              artifact={artifactFixtures[artifactFixtures.length - 1]}
              canEmbed={async () => false}
            />
          </div>
        </ComponentPreview>
      </div>
    </section>
  );
}

function StandaloneArtifacts() {
  return (
    <>
      {artifactFixtures.map((artifact) => (
        <ComponentPreview
          key={artifact.id}
          name={`Artifact · ${artifact.kind}`}
        >
          <div className="h-96 w-full overflow-auto">
            <ArtifactView artifact={artifact} />
          </div>
        </ComponentPreview>
      ))}
    </>
  );
}
