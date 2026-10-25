import { ChartPreviews } from "../gallery/chart-previews";
import {
  ArrowUp,
  ChevronRight,
  Copy,
  Image,
  Paperclip,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { ComponentPreview } from "../gallery/component-preview";
import {
  ApprovalPreview,
  AttachmentPickerPreview,
  BatchApprovalPreview,
  InterruptPreview,
  SingleApprovalPreview,
  AttachmentsPreview,
  ChatPreview,
  ComposerPreview,
  ScrollButtonPreview,
  SidebarPreview,
  SuggestionsPreview,
  WorkspacePreview,
} from "../gallery/interactive-previews";
import {
  assistantMessage,
  conversation,
  interrupts,
  reasoning,
  runningTools,
  toolMessage,
  tools,
  userMessage,
} from "../gallery/fixtures";
import { markdown } from "../../../../scripts/fixtures/events";
import { Message } from "../components/agentdock-ui/message";
import { MessageList } from "../components/agentdock-ui/message-list";
import { MessageContent } from "../components/agentdock-ui/message-content";
import { MarkdownContent } from "../components/agentdock-ui/markdown-content";
import { StreamingText } from "../components/agentdock-ui/streaming-text";
import { Reasoning } from "../components/agentdock-ui/reasoning";
import { ThinkingIndicator } from "../components/agentdock-ui/thinking-indicator";
import { ToolCall } from "../components/agentdock-ui/tool-call";
import { ToolTimeline } from "../components/agentdock-ui/tool-timeline";
import { ToolMessage } from "../components/agentdock-ui/tool-message";
import { ErrorState } from "../components/agentdock-ui/error-state";
import { Alert, InlineAlert } from "../components/agentdock-ui/alert";
import {
  RunStatusBanner,
  TurnStatus,
} from "../components/agentdock-ui/run-status-banner";
import { EmptyState } from "../components/agentdock-ui/empty-state";
import { ChatShell } from "../components/agentdock-ui/chat-shell";
import { ChatViewport } from "../components/agentdock-ui/chat-viewport";
import { ChatActionBar } from "../components/agentdock-ui/chat-action-bar";
import { ChatIcon } from "../components/agentdock-ui/icon";
import { Button } from "../components/agentdock-ui/ui/button";
import { Textarea } from "../components/agentdock-ui/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/agentdock-ui/ui/collapsible";

const categories = [
  "Conversation",
  "Composer",
  "Charts",
  "Activity",
  "Status",
  "Layout",
  "Controls",
];
const transcript = (
  <MessageList
    model={conversation}
    showReasoning
    canRespond={false}
    respondingTo={null}
    onRespond={() => {}}
  />
);

const startedAgo = (seconds: number) => Date.now() - seconds * 1000;

export function ComponentsPage() {
  return (
    <main className="component-gallery" aria-labelledby="gallery-title">
      <div className="gallery-container">
        <div className="gallery-heading">
          <h1 id="gallery-title">Components</h1>
          <span>Live previews · Sample data</span>
        </div>
        <nav aria-label="Component categories" className="gallery-categories">
          {categories.map((category) => (
            <a key={category} href={`#${category.toLowerCase()}`}>
              {category}
            </a>
          ))}
        </nav>

        <section
          id="conversation"
          className="gallery-category"
          aria-labelledby="conversation-heading"
        >
          <h2 id="conversation-heading">Conversation</h2>
          <div className="gallery-grid">
            <ComponentPreview name="Chat" wide className="gallery-chat-preview">
              <ChatPreview />
            </ComponentPreview>
            <ComponentPreview name="Message · User">
              <Message message={userMessage} showReasoning />
            </ComponentPreview>
            <ComponentPreview name="Message · Image attachment">
              <Message
                message={{
                  ...userMessage,
                  id: "gallery-image-message",
                  blocks: [
                    {
                      id: "gallery-image",
                      type: "image",
                      position: 0,
                      state: "complete",
                      url: new URL("/gallery/landscape.svg", location.origin)
                        .href,
                    },
                    {
                      id: "gallery-image-caption",
                      type: "text",
                      position: 1,
                      state: "complete",
                      text: "What do you think of this image?",
                    },
                  ],
                }}
                showReasoning
              />
            </ComponentPreview>
            <ComponentPreview name="Message · Assistant">
              <Message message={assistantMessage} showReasoning />
            </ComponentPreview>
            <ComponentPreview name="MessageList" wide>
              {transcript}
            </ComponentPreview>
            <ComponentPreview name="MessageContent" wide>
              <MessageContent blocks={assistantMessage.blocks} showReasoning />
            </ComponentPreview>
            <ComponentPreview name="MarkdownContent" wide>
              <MarkdownContent text={markdown} />
            </ComponentPreview>
          </div>
        </section>

        <ChartPreviews />

        <section
          id="composer"
          className="gallery-category"
          aria-labelledby="composer-heading"
        >
          <h2 id="composer-heading">Composer</h2>
          <div className="gallery-grid">
            <ComponentPreview name="Composer" wide>
              <ComposerPreview />
            </ComponentPreview>
            <ComponentPreview name="ComposerAttachments" wide>
              <AttachmentsPreview />
            </ComponentPreview>
            <ComponentPreview name="ComposerAttachmentPicker">
              <AttachmentPickerPreview />
            </ComponentPreview>
          </div>
        </section>

        <section
          id="activity"
          className="gallery-category"
          aria-labelledby="activity-heading"
        >
          <h2 id="activity-heading">Activity</h2>
          <div className="gallery-grid">
            <ComponentPreview name="StreamingText">
              <StreamingText
                text="I’m putting together a compact, readable interface…"
                active
              />
            </ComponentPreview>
            <ComponentPreview name="ThinkingIndicator">
              <ThinkingIndicator startedAt={startedAgo(4)} />
            </ComponentPreview>
            <ComponentPreview name="ThinkingIndicator · Step">
              <ThinkingIndicator
                startedAt={startedAgo(12)}
                step={{ label: "Searching the web", tool: "web_search" }}
              />
            </ComponentPreview>
            <ComponentPreview name="ThinkingIndicator · Long" wide>
              <ThinkingIndicator startedAt={startedAgo(64)} onStop={() => {}} />
            </ComponentPreview>
            <ComponentPreview name="Reasoning">
              <Reasoning text={reasoning} active={false} />
            </ComponentPreview>
            <ComponentPreview name="ToolMessage">
              <ToolMessage message={toolMessage} />
            </ComponentPreview>
            <ComponentPreview name="ToolCall" wide>
              <ToolCall item={tools[0]!} />
            </ComponentPreview>
            <ComponentPreview name="ToolTimeline" wide>
              <ToolTimeline tools={tools} />
            </ComponentPreview>
            <ComponentPreview name="ToolTimeline · Running" wide>
              <ToolTimeline tools={runningTools} />
            </ComponentPreview>
            <ComponentPreview name="ApprovalCard" wide>
              <ApprovalPreview />
            </ComponentPreview>
            <ComponentPreview name="ApprovalCard · Single action" wide>
              <SingleApprovalPreview />
            </ComponentPreview>
            <ComponentPreview name="ApprovalCard · Several actions" wide>
              <BatchApprovalPreview />
            </ComponentPreview>
            <ComponentPreview name="InterruptCard · Choice" wide>
              <InterruptPreview sample={interrupts.choice} />
            </ComponentPreview>
            <ComponentPreview name="InterruptCard · Yes or no" wide>
              <InterruptPreview sample={interrupts.confirm} />
            </ComponentPreview>
            <ComponentPreview name="InterruptCard · Text" wide>
              <InterruptPreview sample={interrupts.text} />
            </ComponentPreview>
            <ComponentPreview name="InterruptCard · Form" wide>
              <InterruptPreview sample={interrupts.form} />
            </ComponentPreview>
            <ComponentPreview name="InterruptCard · Read-only" wide>
              <InterruptPreview sample={interrupts.fallback} />
            </ComponentPreview>
          </div>
        </section>

        <section
          id="status"
          className="gallery-category"
          aria-labelledby="status-heading"
        >
          <h2 id="status-heading">Status</h2>
          <div className="gallery-grid">
            <ComponentPreview name="Alert · Tones" wide>
              <div className="grid w-full gap-4 sm:grid-cols-2">
                <Alert
                  tone="error"
                  status="Error"
                  meta="graph_error"
                  title="The run failed"
                  hint="Your conversation is saved."
                  actions={<Button variant="primary">Retry</Button>}
                >
                  The agent hit an error while calling the model.
                </Alert>
                <Alert
                  tone="warning"
                  status="Warning"
                  title="Connection interrupted"
                  actions={<Button variant="outline">Reconnect</Button>}
                >
                  The stream closed before the run finished.
                </Alert>
                <Alert
                  tone="info"
                  status="Notice"
                  title="Another run is active"
                >
                  This conversation is busy in another tab.
                </Alert>
                <Alert tone="success" status="Resolved" title="Back online">
                  Streaming resumed where it left off.
                </Alert>
              </div>
            </ComponentPreview>
            <ComponentPreview name="InlineAlert" wide>
              <div className="flex w-full flex-col gap-2">
                <InlineAlert
                  action={
                    <button
                      type="button"
                      className="text-xs font-medium underline underline-offset-2"
                    >
                      Retry
                    </button>
                  }
                >
                  Couldn’t send your response.
                </InlineAlert>
                <InlineAlert tone="info">
                  Edits change arguments, never the tool.
                </InlineAlert>
                <InlineAlert tone="success">Response sent.</InlineAlert>
              </div>
            </ComponentPreview>
            <ComponentPreview name="ErrorState · Run failed" wide>
              <ErrorState
                title="The agent couldn’t finish"
                detail="Agent execution failed."
                code="graph_error"
                scope="run"
                onRetry={() => {}}
                retryLabel="Retry from last step"
              />
            </ComponentPreview>
            <ComponentPreview name="ErrorState · Connection" wide>
              <ErrorState
                title="Connection interrupted"
                detail="Your answer has been preserved. Try again when you’re ready."
                scope="transport"
              />
            </ComponentPreview>
            <ComponentPreview name="ErrorState · Approval expired" wide>
              <ErrorState
                title="Response not confirmed"
                detail="Approval expired."
                code="approval_expired"
              />
            </ComponentPreview>
            <ComponentPreview name="ErrorState · Thread busy" wide>
              <ErrorState
                title="Response not confirmed"
                detail="A run is already active on this thread."
                code="thread_busy"
              />
            </ComponentPreview>
            <ComponentPreview name="RunStatusBanner · Paused" wide>
              <RunStatusBanner
                state="paused"
                actions={<Button variant="primary">Continue run</Button>}
              />
            </ComponentPreview>
            <ComponentPreview name="RunStatusBanner · Stopped" wide>
              <RunStatusBanner
                state="stopped"
                actions={<Button variant="primary">Continue</Button>}
              />
            </ComponentPreview>
            <ComponentPreview name="RunStatusBanner · Stopped by the app" wide>
              <RunStatusBanner state="cancelled" meta="run.cancelled" />
            </ComponentPreview>
            <ComponentPreview name="RunStatusBanner · Reconnecting" wide>
              <RunStatusBanner
                state="reconnecting"
                meta="attempt 2 of 5"
                progress={0.4}
                actions={<Button variant="outline">Retry now</Button>}
              />
            </ComponentPreview>
            <ComponentPreview name="RunStatusBanner · Offline" wide>
              <RunStatusBanner
                state="offline"
                actions={<Button variant="primary">Try again</Button>}
              />
            </ComponentPreview>
            <ComponentPreview name="RunStatusBanner · Paused elsewhere" wide>
              <RunStatusBanner state="paused-elsewhere" />
            </ComponentPreview>
            <ComponentPreview name="TurnStatus" wide>
              <div className="flex w-full flex-col gap-4">
                <TurnStatus state="stopped">
                  Stopped · your partial answer is kept
                </TurnStatus>
                <TurnStatus state="cancelled">Stopped by the app</TurnStatus>
                <TurnStatus state="paused">Paused at a breakpoint</TurnStatus>
              </div>
            </ComponentPreview>
          </div>
        </section>

        <section
          id="layout"
          className="gallery-category"
          aria-labelledby="layout-heading"
        >
          <h2 id="layout-heading">Layout</h2>
          <div className="gallery-grid">
            <ComponentPreview
              name="ChatWorkspace"
              wide
              className="gallery-workspace-preview"
            >
              <WorkspacePreview />
            </ComponentPreview>
            <ComponentPreview
              name="ChatShell"
              wide
              className="gallery-layout-preview"
            >
              <ChatShell footer={<ComposerPreview />}>
                <div className="min-h-0 flex-1 overflow-auto p-6">
                  {transcript}
                </div>
              </ChatShell>
            </ComponentPreview>
            <ComponentPreview
              name="ChatViewport"
              wide
              className="gallery-layout-preview"
            >
              <ChatViewport revision={conversation} empty={false}>
                {Array.from({ length: 12 }, (_, index) => (
                  <MarkdownContent
                    key={index}
                    text={`**Step ${index + 1}**\n\nKeep the conversation readable and the composer easy to reach. Scroll up to explore earlier messages, then use the arrow to return to the latest.`}
                  />
                ))}
              </ChatViewport>
            </ComponentPreview>
            <ComponentPreview
              name="ThreadSidebar"
              className="gallery-sidebar-preview"
            >
              <SidebarPreview />
            </ComponentPreview>
            <ComponentPreview name="EmptyState">
              <EmptyState title="How can I help you today?" />
            </ComponentPreview>
            <ComponentPreview name="Suggestions" wide>
              <SuggestionsPreview />
            </ComponentPreview>
          </div>
        </section>

        <section
          id="controls"
          className="gallery-category"
          aria-labelledby="controls-heading"
        >
          <h2 id="controls-heading">Controls</h2>
          <div className="gallery-grid">
            <ComponentPreview name="ChatActionBar">
              <ChatActionBar text="A good interface keeps the next step clear." />
            </ComponentPreview>
            <ComponentPreview name="ScrollToLatest">
              <ScrollButtonPreview />
            </ComponentPreview>
            <ComponentPreview name="ChatIcon">
              <div className="flex flex-wrap items-center gap-5 text-muted-foreground">
                {[
                  ArrowUp,
                  Paperclip,
                  Image,
                  Search,
                  Copy,
                  ChevronRight,
                  Wrench,
                  ShieldCheck,
                ].map((icon, index) => (
                  <ChatIcon key={index} icon={icon} size={16} />
                ))}
              </div>
            </ComponentPreview>
            <ComponentPreview name="Button">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="outline">Outline</Button>
                <Button>Ghost</Button>
                <Button disabled>Disabled</Button>
              </div>
            </ComponentPreview>
            <ComponentPreview name="Textarea">
              <Textarea
                aria-label="Sample text area"
                placeholder="Write something…"
                defaultValue="A small idea worth exploring."
                rows={2}
              />
            </ComponentPreview>
            <ComponentPreview name="Collapsible">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline">Show details</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                    Additional context stays available when you need it.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </ComponentPreview>
          </div>
        </section>
      </div>
    </main>
  );
}
